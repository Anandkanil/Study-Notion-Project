const RatingAndReview = require('../models/RatingAndReview');
const Course = require('../models/Course');

exports.createRating = async (req, res) => {
    try {
        // Get user ID and course ID
        const userId = req.user.userId;
        const { rating, review, courseId } = req.body;

        // Validate that the user is enrolled in the course
        const courseDetails = await Course.findOne({
            _id: courseId,
            studentsEnrolled: { $elemMatch: { $eq: userId } }
        });

        if (!courseDetails) {
            return res.status(400).json({
                success: false,
                message: "Invalid course ID or the user is not enrolled in this course."
            });
        }

        // Check if the user has already submitted a rating and review for this course
        const alreadyReviewed = await RatingAndReview.findOne({ user: userId, course: courseId });

        if (alreadyReviewed) {
            return res.status(400).json({
                success: false,
                message: "User has already submitted a rating and review for this course."
            });
        }

        // Create a new rating and review entry
        const newRatingAndReview = new RatingAndReview({
            user: userId,
            course: courseId,
            rating,
            review
        });

        // Save the new rating and review
        const savedRatingAndReview = await newRatingAndReview.save();

        // Update the course with the new rating and review
        await Course.findByIdAndUpdate(
            courseId,
            { $push: { ratingAndReviews: savedRatingAndReview._id } },
            { new: true }
        );

        // Return success response
        return res.status(201).json({
            success: true,
            message: "Rating and review added successfully."
        });

    } catch (error) {
        console.error("Error in create Rating:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while adding the rating and review. Please try again later."
        });
    }
};

exports.getAverageRating = async (req, res) => {
    try {
        // Get CourseId from request body
        const courseId = req.body.courseId;

        // Calculate average Rating
        const result = await RatingAndReview.aggregate([
            {
                $match: {
                    course: new mongoose.Types.ObjectId(courseId),
                }
            }, 
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                }
            }
        ]);

        // Check if there are any ratings
        if (result.length === 0) {
            return res.status(200).json({
                success: true,
                averageRating: 0, // No ratings found
                message: "No ratings found for this course."
            });
        }

        // Return the average rating
        return res.status(200).json({
            success: true,
            averageRating: result[0].averageRating,
            message: "Average rating retrieved successfully."
        });

    } catch (error) {
        console.error("Error in calculating average rating:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while calculating the average rating. Please try again later."
        });
    }
};

// Get All Ratings And Reviews
exports.getAllRatingAndReviews = async function(req, res) {
    try {
        // Fetch all ratings and reviews from the database
        const ratingsAndReviews = await RatingAndReview.find().sort({rating:"desc"}).populate('user', 'firstName lastName email image').populate('course','courseName courseDescription'); // Populate user details if needed

        // Return the ratings and reviews
        return res.status(200).json({
            success: true,
            ratingsAndReviews,
            message: "All ratings and reviews retrieved successfully."
        });
    } catch (error) {
        console.error("Error in fetching all ratings and reviews:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching ratings and reviews. Please try again later."
        });
    }
}

// Get All the Ratings for the Particular Course
exports.getCourseAllRatings = async (req, res) => {
    try {
        // Get courseId from request body
        const courseId = req.body.courseId;

        // Fetch all ratings and reviews for the specified course
        const courseRatings = await RatingAndReview.find({ course: courseId }).populate('user', 'username email'); // Populate user details if needed

        // Check if there are any ratings for the course
        if (courseRatings.length === 0) {
            return res.status(200).json({
                success: true,
                ratings: [],
                message: "No ratings found for this course."
            });
        }

        // Return the ratings for the course
        return res.status(200).json({
            success: true,
            ratings: courseRatings,
            message: "Ratings for the course retrieved successfully."
        });
    } catch (error) {
        console.error("Error in fetching ratings for the course:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching ratings for the course. Please try again later."
        });
    }
}
