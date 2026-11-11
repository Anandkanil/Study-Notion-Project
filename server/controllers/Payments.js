const instance = require("../config/Razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail");
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail");
const crypto = require("crypto");
const mongoose = require("mongoose");
const CourseProgress = require("../models/CourseProgress");

// Razorpay allows 15 note keys per order: one for the buyer, the rest for course ids.
const MAX_COURSES_PER_ORDER = 14;

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
      totalAmount += course.price;
    }
  } catch (error) {
    console.error("capturePayment:", error.message);
    return res.status(500).json({ success: false, message: "Could not initiate order" });
  }

  // The order itself records who is buying which courses; verifyPayment trusts only this.
  const notes = { userId: String(userId) };
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
  return res.status(200).json({ success: true, message: "Payment Verified" });
};

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
        { $addToSet: { courses: courseId, courseProgress: courseProgress._id } },
        { new: true }
      );

      if (isNewEnrolment && enrolledStudent) {
        // Don't make the buyer wait for email delivery
        mailSender.inBackground(
          enrolledStudent.email,
          `Successfully Enrolled into ${enrolledCourse.courseName}`,
          courseEnrollmentEmail(enrolledCourse.courseName, enrolledStudent.firstName, enrolledCourse.thumbnail)
        );
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

    mailSender.inBackground(
      enrolledStudent.email,
      "Payment Received",
      paymentSuccessEmail(enrolledStudent.firstName, amount / 100, orderId, paymentId)
    );

    return res.status(200).json({ success: true, message: "Payment receipt is on its way" });
  } catch (error) {
    console.error("Error in sending email:", error.message);
    return res.status(500).json({ success: false, message: "Could not send email" });
  }
};
