const mongoose = require('mongoose');
const Course = require('../models/Course');
const Category = require('../models/Category');
const User = require('../models/User');
const { uploadImageToCloudinary } = require('../utils/imageUploader');
require('dotenv').config();

// Function to create a new course
const createCourse = async (req, res) => {
    const {
        courseName,
        courseDescription,
        whatYouWillLearn,
        price,
        tags,   // Expects an array of strings
        category,
        instructions
    } = req.body;

    // Check if thumbnail exists in the uploaded files
    if (!req.files || !req.files.thumbnail) {
        return res.status(400).json({
            success: false,
            message: "Thumbnail image is required."
        });
    }

    const thumbnail = req.files.thumbnail;
    const instructor = req.user.userId; // `userId` is populated by authentication middleware
    let thumbnailImage;

    try {
        // Upload thumbnail image
        thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME,1000,1000);

        // Validate required fields
        if (!courseName || !courseDescription || !instructor || !price || !whatYouWillLearn || !tags || tags.length === 0 || !category) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided."
            });
        }

        // Check if the category exists
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(400).json({
                success: false,
                message: "Invalid CategoryId."
            });
        }
        console.log(thumbnailImage);
        // Create a new course document
        const newCourse = new Course({
            courseName,
            courseDescription,
            instructor,
            whatYouWillLearn,
            courseContent: [], // Initializing as empty, to be populated with sections later
            price,
            thumbnail: thumbnailImage.url,
            tags,
            category,
            instructions
        });

        // Save the course to the database
        await newCourse.save();

        // Add course ID to the instructor's course list
        await User.findByIdAndUpdate(instructor, { $push: { courses: newCourse._id } }, { new: true });

        // Add course ID to the Category's `courses` array
        await Category.findByIdAndUpdate(category, { $push: { courses: newCourse._id } }, { new: true });

        // Respond with success
        return res.status(201).json({
            success: true,
            message: "Course created successfully.",
            course: newCourse
        });
    } catch (error) {
        console.error("Error creating course:", error.message);
        return res.status(500).json({
            success: false,
            message: `An error occurred while creating the course. ${error.message}`
        });
    }
};

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
