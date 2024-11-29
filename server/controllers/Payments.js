const instance = require("../config/Razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail");
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail");
const crypto = require("crypto");
const mongoose = require("mongoose");

// Initiate the Razorpay order
exports.capturePayment = async (req, res) => {
  const { courses } = req.body;
  const userId = req.user.userId;

  if (courses.length === 0) {
    return res.json({ success: false, message: "Please provide Course Id" });
  }

  let totalAmount = 0;

  for (const course_id of courses) {
    let course;
    try {
      course = await Course.findById(course_id);
      if (!course) {
        return res.status(200).json({ success: false, message: "Could not find the course" });
      }

      const uid = new mongoose.Types.ObjectId(userId);
      if (course.studentsEnrolled.includes(uid)) {
        return res.status(200).json({ success: false, message: "Student is already Enrolled" });
      }

      totalAmount += course.price;
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  const currency = "INR";
  const options = {
    amount: totalAmount * 100,
    currency,
    receipt: Math.random(Date.now()).toString(),
  };

  try {
    const paymentResponse = await instance.orders.create(options);
    res.json({
      success: true,
      message: paymentResponse,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Could not Initiate Order" });
  }
};

// Verify the payment
exports.verifyPayment = async (req, res) => {
  const razorpay_order_id = req.body?.razorpay_order_id;
  const razorpay_payment_id = req.body?.razorpay_payment_id;
  const razorpay_signature = req.body?.razorpay_signature;
  const courses = req.body?.courses;
  const userId = req.user.userId;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courses || !userId) {
    return res.status(200).json({ success: false, message: "Payment Failed" });
  }

  let body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  console.log(`The expected signature is ${expectedSignature} and the received signature is ${razorpay_signature}`);

  if (expectedSignature === razorpay_signature) {
    // Enroll the student
    await enrollStudents(courses, userId, res);
    // Return success
    return res.status(200).json({ success: true, message: "Payment Verified" });
  }
  return res.status(200).json({ success: "false", message: "Payment Failed" });
};

const enrollStudents = async (courses, userId, res) => {
  if (!courses || !userId) {
    return res.status(400).json({ success: false, message: "Please Provide data for Courses or UserId" });
  }

  for (const courseId of courses) {
    try {
      console.log(`The course id is ${courseId} and the user Id is ${userId}`);

      // Find the course and enroll the student in it
      const enrolledCourse = await Course.findOneAndUpdate(
        { _id: courseId },
        { $push: { studentsEnrolled: userId } },
        { new: true }
      );

      if (!enrolledCourse) {
        return res.status(500).json({ success: false, message: "Course not Found" });
      }

      // Find the student and add the course to their list of enrolledCourses
      const enrolledStudent = await User.findByIdAndUpdate(userId, {
        $push: { courses: courseId },
      }, { new: true });

      // Send email to the student
      const emailResponse = await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(enrolledCourse.courseName, enrolledStudent.firstName,enrolledCourse.thumbnail)
      );
      // console.log("Email Sent Successfully", emailResponse.response);
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body;
  const userId = req.user.userId;

  if (!orderId || !paymentId || !amount || !userId) {
    return res.status(400).json({ success: false, message: "Please provide all the fields" });
  }

  try {
    // Find the student
    const enrolledStudent = await User.findById(userId);
    if (!enrolledStudent) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Send payment success email
    await mailSender(
      enrolledStudent.email,
      "Payment Received",
      paymentSuccessEmail(
        enrolledStudent.firstName,
        amount / 100,
        orderId,
        paymentId
      )
    );

    // Respond with success message
    return res.status(200).json({
      success: true,
      message: "Payment success email sent successfully",
    });
  } catch (error) {
    console.log("Error in sending email:", error);
    return res.status(500).json({
      success: false,
      message: "Could not send email",
    });
  }
};
