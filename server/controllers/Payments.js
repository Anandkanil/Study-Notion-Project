const instance = require("../config/Razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail");
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail");
const crypto = require("crypto");
const mongoose = require("mongoose");
const CourseProgress = require("../models/CourseProgress");
const Purchase = require("../models/Purchase");
const Coupon = require("../models/Coupon");
const { findCoupon, discounted, normalize } = require("../utils/coupons");
const { newEnrolmentEmail } = require("../mail/templates/newEnrolmentEmail");

// Razorpay allows 15 note keys per order: buyer, coupon, and up to 13 course ids.
const MAX_COURSES_PER_ORDER = 13;

// Initiate the Razorpay order
exports.capturePayment = async (req, res) => {
  const userId = req.user.userId;
  const courses = Array.isArray(req.body?.courses) ? [...new Set(req.body.courses.map(String))] : [];

  if (courses.length === 0) {
    return res.status(400).json({ success: false, message: "Please provide Course Id" });
  }
  if (courses.length > MAX_COURSES_PER_ORDER) {
    return res.status(400).json({ success: false, message: `You can buy up to ${MAX_COURSES_PER_ORDER} courses at once.` });
  }

  // Optional discount code, checked against the courses being bought
  let coupon = null;
  if (req.body?.couponCode) {
    try {
      const found = await findCoupon(req.body.couponCode, courses);
      if (found.error) return res.status(400).json({ success: false, message: found.error });
      coupon = found.coupon;
    } catch (error) {
      console.error("capturePayment coupon:", error.message);
      return res.status(500).json({ success: false, message: "Couldn't check the discount code. Please try again." });
    }
  }

  let totalAmount = 0;
  try {
    for (const courseId of courses) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return res.status(400).json({ success: false, message: "Invalid course id" });
      }
      const course = await Course.findById(courseId).select("price status studentsEnrolled courseName");
      if (!course) {
        return res.status(404).json({ success: false, message: "Could not find the course" });
      }
      if (course.studentsEnrolled.some((id) => String(id) === String(userId))) {
        return res.status(409).json({ success: false, message: `You are already enrolled in ${course.courseName}` });
      }
      totalAmount += coupon && String(coupon.course) === String(courseId) ? discounted(course.price, coupon.percentOff) : course.price;
    }
  } catch (error) {
    console.error("capturePayment:", error.message);
    return res.status(500).json({ success: false, message: "Could not initiate order" });
  }

  // The order itself records who is buying which courses; verifyPayment trusts only this.
  if (totalAmount < 1) {
    return res.status(400).json({ success: false, message: "The order total is too low to pay online." });
  }

  const notes = { userId: String(userId) };
  if (coupon) notes.coupon = `${coupon.code}:${coupon.percentOff}:${coupon.course}`;
  courses.forEach((id, i) => { notes[`c${i}`] = id; });

  try {
    const paymentResponse = await instance.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `sn_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      notes,
    });
    return res.json({ success: true, message: paymentResponse });
  } catch (error) {
    console.error("Razorpay order error:", error?.error?.description || error.message);
    return res.status(500).json({ success: false, message: "Could not Initiate Order" });
  }
};

// Verify the payment
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  const userId = req.user.userId;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: "Payment Failed" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const sigOk =
    expectedSignature.length === String(razorpay_signature).length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(String(razorpay_signature)));

  if (!sigOk) {
    return res.status(400).json({ success: false, message: "Payment verification failed" });
  }

  // Course ids come from the paid order, never from the request body
  let order;
  try {
    order = await instance.orders.fetch(razorpay_order_id);
  } catch (error) {
    console.error("Razorpay order fetch error:", error?.error?.description || error.message);
    return res.status(502).json({ success: false, message: "Could not confirm the order with Razorpay" });
  }

  const notes = order?.notes || {};
  if (String(notes.userId) !== String(userId)) {
    return res.status(403).json({ success: false, message: "This order belongs to another account" });
  }
  const courses = Object.keys(notes)
    .filter((k) => /^c\d+$/.test(k))
    .map((k) => notes[k]);

  if (courses.length === 0) {
    return res.status(400).json({ success: false, message: "No courses found on this order" });
  }

  const result = await enrollStudents(courses, userId);
  if (!result.success) {
    return res.status(500).json({ success: false, message: result.message });
  }
  await recordPurchase({ order, paymentId: razorpay_payment_id, userId, courses });
  return res.status(200).json({ success: true, message: "Payment Verified" });
};

// Saves the purchase for the Purchases page. Once per order; never blocks enrolment.
const recordPurchase = async ({ order, paymentId, userId, courses }) => {
  try {
    const found = await Course.find({ _id: { $in: courses } }).select("courseName price").lean();
    const byId = new Map(found.map((c) => [String(c._id), c]));
    // Discount used on this order (recorded in the order notes when it was created)
    const [code, pct, couponCourse] = String(order.notes?.coupon || "").split(":");
    const coupon = code ? { code, percentOff: Number(pct), course: couponCourse } : null;
    const priceOf = (id) => {
      const base = byId.get(String(id))?.price;
      if (base == null) return null;
      return coupon && String(coupon.course) === String(id) ? discounted(base, coupon.percentOff) : base;
    };
    const result = await Purchase.updateOne(
      { orderId: order.id },
      {
        $setOnInsert: {
          user: userId,
          courses: courses.map((id) => ({ course: id, courseName: byId.get(String(id))?.courseName || "Course", price: priceOf(id) })),
          ...(coupon ? { coupon } : {}),
          amount: Math.round(Number(order.amount || 0)) / 100,
          currency: order.currency || "INR",
          orderId: order.id,
          paymentId,
        },
      },
      { upsert: true }
    );
    // Count the code as used once per paid order
    if (coupon && result?.upsertedCount) {
      await Coupon.updateOne({ code: normalize(coupon.code), course: coupon.course }, { $inc: { uses: 1 } });
    }
  } catch (error) {
    console.error("Could not record purchase:", error.message);
  }
};

// POST /payment/coupon { code, courses } — check a code and show the new price before paying
exports.checkCoupon = async (req, res) => {
  const courses = Array.isArray(req.body?.courses) ? [...new Set(req.body.courses.map(String))].filter((id) => mongoose.Types.ObjectId.isValid(id)) : [];
  if (!req.body?.code || courses.length === 0) return res.status(400).json({ success: false, message: "Enter a code." });
  try {
    const found = await findCoupon(req.body.code, courses);
    if (found.error) return res.status(400).json({ success: false, message: found.error });
    const c = found.coupon;
    const course = await Course.findById(c.course).select("courseName price").lean();
    const newPrice = discounted(course.price, c.percentOff);
    return res.status(200).json({
      success: true,
      message: `${c.code} applied: ${c.percentOff}% off ${course.courseName}`,
      data: { code: c.code, percentOff: c.percentOff, courseId: String(c.course), courseName: course.courseName, oldPrice: course.price, newPrice, saving: course.price - newPrice },
    });
  } catch (error) {
    console.error("checkCoupon:", error.message);
    return res.status(500).json({ success: false, message: "Couldn't check the code. Please try again." });
  }
};

// The signed-in student's purchases, newest first
exports.getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({ user: req.user.userId })
      .select("courses amount currency orderId paymentId createdAt")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, data: purchases });
  } catch (error) {
    console.error("getPurchases:", error.message);
    return res.status(500).json({ success: false, message: "Your purchases couldn't load. Please try again." });
  }
};

async function notifyInstructor(course, student) {
  if (!course.instructor) return;
  const teacher = await User.findById(course.instructor).select("email firstName").lean();
  if (!teacher?.email) return;
  mailSender.inBackground(
    teacher.email,
    `New student in ${course.courseName}`,
    newEnrolmentEmail(teacher.firstName, `${student.firstName} ${student.lastName || ""}`.trim(), course.courseName, (course.studentsEnrolled || []).length)
  );
}

// Enrols the user in each course. Safe to call twice for the same order.
const enrollStudents = async (courses, userId) => {
  for (const courseId of courses) {
    try {
      const enrolledCourse = await Course.findOneAndUpdate(
        { _id: courseId },
        { $addToSet: { studentsEnrolled: userId } },
        { new: true }
      );
      if (!enrolledCourse) {
        return { success: false, message: "Course not found" };
      }

      let courseProgress = await CourseProgress.findOne({ courseID: courseId, userId });
      const isNewEnrolment = !courseProgress;
      if (!courseProgress) {
        courseProgress = await CourseProgress.create({ courseID: courseId, userId, completedVideos: [] });
      }

      const enrolledStudent = await User.findByIdAndUpdate(
        userId,
        // Enrol, and drop the course from the wishlist now that it's bought
        { $addToSet: { courses: courseId, courseProgress: courseProgress._id }, $pull: { wishlist: courseId } },
        { new: true }
      );

      if (isNewEnrolment && enrolledStudent) {
        // Don't make the buyer wait for email delivery
        mailSender.inBackground(
          enrolledStudent.email,
          `Successfully Enrolled into ${enrolledCourse.courseName}`,
          courseEnrollmentEmail(enrolledCourse.courseName, enrolledStudent.firstName, enrolledCourse.thumbnail)
        );
        // Tell the instructor about the new student (a notice only: never blocks enrolment)
        notifyInstructor(enrolledCourse, enrolledStudent).catch((e) => console.error("Instructor notice:", e.message));
      }
    } catch (error) {
      console.error("Enrolment error:", error.message);
      return { success: false, message: "Could not complete enrolment. Please contact support." };
    }
  }
  return { success: true };
};

exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body;
  const userId = req.user.userId;

  if (!orderId || !paymentId || !amount || !userId) {
    return res.status(400).json({ success: false, message: "Please provide all the fields" });
  }

  try {
    const enrolledStudent = await User.findById(userId);
    if (!enrolledStudent) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Use the amount we recorded from Razorpay when there is one, not the one the browser sent
    const purchase = await Purchase.findOne({ orderId: String(orderId), user: userId }).select("amount").lean();
    const paid = purchase ? purchase.amount : amount / 100;

    mailSender.inBackground(
      enrolledStudent.email,
      "Payment Received",
      paymentSuccessEmail(enrolledStudent.firstName, paid, orderId, paymentId)
    );

    return res.status(200).json({ success: true, message: "Payment receipt is on its way" });
  } catch (error) {
    console.error("Error in sending email:", error.message);
    return res.status(500).json({ success: false, message: "Could not send email" });
  }
};
