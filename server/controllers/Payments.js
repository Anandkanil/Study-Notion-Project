const instance = require('../config/Razorpay');
const Course = require('../models/Course');
const User = require('../models/User');
const mailSender = require('../utils/mailSender');
const { courseEnrollmentEmail } = require('../mail/templates/courseEnrollmentEmail');
const crypto = require('crypto'); 

// Capture the payment and initiate Razorpay
exports.capturePayment = async (req, res) => {
    // Get courseId and userId from request
    const courseId = req.body.courseId;
    const userId = req.user.userId;

    // Validate if courseId is provided
    if (!courseId) {
        return res.status(400).json({ success: false, message: 'Please provide a valid CourseId' });
    }

    try {
        // Find the course using the courseId
        const course = await Course.findById(courseId);

        // Validate if the course exists
        if (!course) {
            return res.status(400).json({ success: false, message: 'Not a valid Course' });
        }

        // Check if the user is already enrolled in the course
        if (course.studentsEnrolled.includes(userId)) {
            return res.status(400).json({ success: false, message: 'You have already enrolled in this course' });
        }

        // Calculate the amount for payment (in smallest currency unit, i.e., paise)
        const amount = course.price * 100;
        const currency = "INR";

        // Razorpay order creation options
        const options = {
            amount, // amount in paise
            currency, // currency type
            receipt: `receipt#${courseId}_${userId}`, // unique receipt id
            notes: {
                courseId, // pass courseId and userId in notes
                userId
            }
        };

        // Create the payment order using Razorpay API
        const order = await instance.orders.create(options);

        // Respond with order details and other relevant course info
        return res.status(200).json({
            success: true,
            message: 'Payment initiated successfully',
            amount,
            currency,
            courseName: course.courseName,
            courseDescription: course.courseDescription,
            thumbnail: course.thumbnail,
            orderId: order.id,
            order
        });

    } catch (error) {
        console.error('Error during payment capture:', error.message);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request'
        });
    }
};

// Verify the payment signature to ensure payment authenticity
exports.verifySignature = async (req, res) => {
    try {
        // Extract payment and order details from the request body
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        // Validate the presence of essential fields
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment information' });
        }

        // Generate the expected signature based on the order and payment IDs
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET) // Use your Razorpay secret key
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        // Compare the generated signature with the received signature
        if (generatedSignature === razorpay_signature) {
            // Extract courseId and userId from Razorpay's payment entity
            const { courseId, userId } = req.body.payload.payment.entity.notes;

            try {
                // Find the course and add the user to the studentsEnrolled array
                const course = await Course.findByIdAndUpdate(
                    courseId,
                    { $addToSet: { studentsEnrolled: userId } }, // $addToSet ensures no duplicate entries
                    { new: true } // Return the updated course
                );

                // If course is not found, return an error
                if (!course) {
                    return res.status(404).json({ success: false, message: "Course not found" });
                }

                // Find the user and add the courseId to the user's courses list
                await User.findByIdAndUpdate(
                    userId,
                    { $addToSet: { courses: courseId } }, // $addToSet ensures no duplicate course entries
                    { new: true } // Return the updated user
                );

                //Mailing the student about the enrollment success
                 // Fetch user details (email) for sending the enrollment confirmation email
                 const user = await User.findById(userId);

                 // Send a confirmation email to the user about successful enrollment
                 const emailSubject = `Successful Enrollment in ${course.courseName}`;
                 const emailContent = courseEnrollmentEmail(course.courseName, user.firstName); // Email template with course and user data
 
                 await mailSender.sendMail(user.email, emailSubject, emailContent);

                // Respond with a success message
                return res.status(200).json({
                    success: true,
                    message: "User successfully enrolled in the course.",
                    course
                });
            } catch (error) {
                // Catch any errors related to enrolling the student
                console.error("Error enrolling student:", error);
                return res.status(500).json({
                    success: false,
                    message: "An error occurred while enrolling the student."
                });
            }
        } else {
            // If the signatures don’t match, return an error
            return res.status(400).json({
                success: false,
                message: 'Invalid signature, payment verification failed'
            });
        }
    } catch (error) {
        // Catch any errors during signature verification
        console.error('Error verifying payment signature:', error.message);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during signature verification'
        });
    }
};
