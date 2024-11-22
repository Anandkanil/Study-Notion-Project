const mongoose = require('mongoose');
const Course = require('../models/Course');
const Category = require('../models/Category');
const User = require('../models/User');
const { uploadImageToCloudinary } = require('../utils/imageUploader');
require('dotenv').config();

// Function to create a new course
const createCourse = async (req, res) => {
  try {
    // Get user ID from request object
    const userId = req.user.userId;
    // Get all required fields from request body
    let {
      courseName,
      courseDescription,
      whatYouWillLearn,
      price,
      tag: _tag,
      category,
      status,
      instructions: _instructions,
    } = req.body
    // Get thumbnail image from request files
    const thumbnail = req.files?.thumbnailImage

    // Convert the tag and instructions from stringified Array to Array
    const tag = JSON.parse(_tag)
    const instructions = JSON.parse(_instructions)

    console.log("tag", tag)
    console.log("instructions", instructions)

    // Check if any of the required fields are missing
    if (
      !courseName ||
      !courseDescription ||
      !whatYouWillLearn ||
      !price ||
      !tag.length ||
      !thumbnail ||
      !category ||
      !instructions.length
    ) {
      return res.status(400).json({
        success: false,
        message: "All Fields are Mandatory",
      })
    }
    if (!status || status === undefined) {
      status = "Draft"
    }
    // Check if the user is an instructor
    const instructorDetails = await User.findById(userId, {
      accountType: "Instructor",
    })

    if (!instructorDetails) {
      return res.status(404).json({
        success: false,
        message: "Instructor Details Not Found",
      })
    }

    // Check if the tag given is valid
    const categoryDetails = await Category.findById(category)
    if (!categoryDetails) {
      return res.status(404).json({
        success: false,
        message: "Category Details Not Found",
      })
    }
    // Upload the Thumbnail to Cloudinary
    const thumbnailImage = await uploadImageToCloudinary(
      thumbnail,
      process.env.FOLDER_NAME
    )
    console.log(thumbnailImage)
    // Create a new course with the given details
    const newCourse = await Course.create({
      courseName,
      courseDescription,
      instructor: instructorDetails._id,
      whatYouWillLearn: whatYouWillLearn,
      price,
      tag,
      category: categoryDetails._id,
      thumbnail: thumbnailImage.url,
      status: status,
      instructions,
    })

    // Add the new course to the User Schema of the Instructor
    await User.findByIdAndUpdate(
      {
        _id: instructorDetails._id,
      },
      {
        $push: {
          courses: newCourse._id,
        },
      },
      { new: true }
    )
    // Add the new course to the Categories
    const categoryDetails2 = await Category.findByIdAndUpdate(
      { _id: category },
      {
        $push: {
          courses: newCourse._id,
        },
      },
      { new: true }
    )
    console.log("HEREEEEEEEE", categoryDetails2)
    // Return the new course and a success message
    res.status(200).json({
      success: true,
      data: newCourse,
      message: "Course Created Successfully",
    })
  } catch (error) {
    // Handle any errors that occur during the creation of the course
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Failed to create course",
      error: error.message,
    })
  }
}

// Function to get all courses
const getAllCourses = async (req, res) => {
    try {
        // Fetch all courses with optional population of related fields
        const courses = await Course.find()
            .populate('instructor', 'firstName lastName email') // Populate instructor's basic info
            .populate('courseContent', 'sectionName lectures')  // Populate course content details
            .populate('category', 'name')                       // Populate Category name
            .populate('ratingAndReviews', 'rating review');     // Populate reviews and ratings

        if (courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No courses found."
            });
        }

        // Respond with the list of courses
        return res.status(200).json({
            success: true,
            courses
        });
    } catch (error) {
        console.error("Error fetching courses:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetcthing courses."
        });
    }
};

const getCourseDetails = async (req, res) => {
    const courseId = req.body.courseId;

    // Validating data
    if (!courseId) {
        return res.status(400).json({ success: false, message: "Course ID is required." });
    }

    try {
        const courseDetails = await Course.findById(courseId)
            .populate('instructor')
            .populate({
                path: 'courseContent',
                populate: {
                    path: 'subSection',
                }
            })
            .populate('ratingAndReviews')
            .populate('category')
            .populate('studentsEnrolled');

        if (!courseDetails) {
            return res.status(404).json({ success: false, message: "No course found with the provided ID." });
        }

        return res.status(200).json({
            data: courseDetails,
            success: true,
            message: "Course details retrieved successfully."
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while retrieving course details. Please try again later."
        });
    }
};


module.exports = { createCourse, getAllCourses,getCourseDetails };
