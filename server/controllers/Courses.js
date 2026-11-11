const mongoose = require('mongoose');
const Course = require('../models/Course');
const Category = require('../models/Category');
const User = require('../models/User');
const SubSection = require("../models/SubSection")
const Section = require("../models/Section")
const CourseProgress = require("../models/CourseProgress")
const { uploadImageToCloudinary } = require('../utils/imageUploader');
const { convertSecondsToDuration } = require("../utils/secToDuration")
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
      tags: _tag,
      category,
      status,
      instructions: _instructions,
    } = req.body
    // Get thumbnail image from request files
    const thumbnail = req.files?.thumbnailImage

    // Convert the tag and instructions from stringified Array to Array
    const tags = JSON.parse(_tag)
    const instructions = JSON.parse(_instructions)

    // console.log("tag", tag)
    // console.log("instructions", instructions)

    // Check if any of the required fields are missing
    if (
      !courseName ||
      !courseDescription ||
      !whatYouWillLearn ||
      !price ||
      !tags.length ||
      !thumbnail ||
      !category ||
      !instructions.length
    ) {
      return res.status(400).json({
        success: false,
        message: "All Fields are Mandatory",
        data:{courseName,courseDescription,whatYouWillLearn,price}
      })
    }
    const priceNumber = Number(price)
    if (!Number.isInteger(priceNumber) || priceNumber < 0) {
      return res.status(400).json({ success: false, message: "Price must be a whole number of rupees, 0 or more." })
    }
    price = priceNumber
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
    // console.log(thumbnailImage)
    // Create a new course with the given details
    const newCourse = await Course.create({
      courseName,
      courseDescription,
      instructor: instructorDetails._id,
      whatYouWillLearn: whatYouWillLearn,
      price,
      tags,
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
    // console.log("HEREEEEEEEE", categoryDetails2)
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
            .populate('instructor', 'firstName lastName image') // Populate instructor's basic info
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

// GET /course/search?q=react — published courses whose name, description, tags,
// subject or instructor match. Public; returns only what a course card needs.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchCourses = async (req, res) => {
    try {
        const q = String(req.query.q || '').trim().slice(0, 80);
        if (q.length < 2) {
            return res.status(200).json({ success: true, query: q, courses: [] });
        }
        const pattern = new RegExp(escapeRegex(q), 'i');

        const [categories, instructors] = await Promise.all([
            Category.find({ name: pattern }).select('_id'),
            User.find({ accountType: 'Instructor', $or: [{ firstName: pattern }, { lastName: pattern }] }).select('_id'),
        ]);

        const courses = await Course.find({
            status: 'Published',
            $or: [
                { courseName: pattern },
                { courseDescription: pattern },
                { tags: pattern },
                { category: { $in: categories.map((c) => c._id) } },
                { instructor: { $in: instructors.map((u) => u._id) } },
            ],
        })
            .select('courseName thumbnail price instructor ratingAndReviews category')
            .populate('instructor', 'firstName lastName')
            .populate('category', 'name')
            .populate('ratingAndReviews', 'rating')
            .limit(48)
            .lean();

        // Title matches first, then the rest
        courses.sort((a, b) => Number(pattern.test(b.courseName)) - Number(pattern.test(a.courseName)));

        return res.status(200).json({ success: true, query: q, courses });
    } catch (error) {
        console.error('Course search failed:', error.message);
        return res.status(500).json({ success: false, message: "Search isn't working right now. Please try again." });
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
            .populate({
              path: 'instructor',
              select: 'firstName lastName image additionalDetails',
              populate:{
                path:'additionalDetails',
                select: 'about'
              }
            })
            .populate({
                path: 'courseContent',
                populate: {
                    path: 'subSection',
                    // Public page: lecture titles and durations only, never the video URLs
                    select: 'title timeDuration description',
                }
            })
            .populate('ratingAndReviews')
            .populate('category')
            // Only ids: the page just needs to know whether the viewer is enrolled
            .populate('studentsEnrolled', '_id');

        if (!courseDetails) {
            return res.status(404).json({ success: false, message: "No course found with the provided ID." });
        }
        let totalDurationInSeconds = 0
        courseDetails.courseContent.forEach((content) => {
          content.subSection.forEach((subSection) => {
            const timeDurationInSeconds = parseInt(subSection.timeDuration)
            totalDurationInSeconds += timeDurationInSeconds
          })
        })
    
        const totalDuration = convertSecondsToDuration(totalDurationInSeconds)
    
        return res.status(200).json({
          success: true,
          data: {
            courseDetails,
            totalDuration,
          },
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while retrieving course details. Please try again later."
        });
    }
};
const editCourseStatus = async (req, res) => {
  // Extract courseId and status from the request body
  const { courseId, status: courseStatus } = req.body;

  // Validate input
  if (!courseId || !courseStatus) {
    return res.status(400).json({
      success: false,
      message: "Both 'courseId' and 'status' are required.",
    });
  }

  try {
    // Check if the course exists
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found. Please provide a valid course ID.",
      });
    }

    // Update the course status
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { status: courseStatus },
      { new: true, runValidators: true } // Return updated document and validate input
    );

    if (!updatedCourse) {
      return res.status(500).json({
        success: false,
        message: "Failed to update course status. Please try again.",
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      message: "Course status updated successfully.",
      data: updatedCourse, // Include the updated course for confirmation
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error in editCourse:", error);

    // Handle unexpected errors
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred. Please try again later.",
    });
  }
}

const getInstructorCourses =  async(req,res) => {
  try {
    // Get the instructor ID from the authenticated user or request body
    const instructorId = req.user.userId

    // Find all courses belonging to the instructor
    const instructorCourses = await Course.find({
      instructor: instructorId,
    }).populate({
      path: 'courseContent',
      populate: {
          path: 'subSection',
      }
  }).sort({ createdAt: -1 })

    // Return the instructor's courses
    res.status(200).json({
      success: true,
      data: instructorCourses,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Failed to retrieve instructor courses",
      error: error.message,
    })
  }  

}

// Delete the Course
const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.body

    // Find the course
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ message: "Course not found" })
    }

    // Unenroll students from the course
    const studentsEnrolled = course.studentsEnrolled
    for (const studentId of studentsEnrolled) {
      await User.findByIdAndUpdate(studentId, {
        $pull: { courses: courseId },
      })
    }

    // Delete sections and sub-sections
    const courseSections = course.courseContent
    for (const sectionId of courseSections) {
      // Delete sub-sections of the section
      const section = await Section.findById(sectionId)
      if (section) {
        const subSections = section.subSection
        for (const subSectionId of subSections) {
          await SubSection.findByIdAndDelete(subSectionId)
        }
      }

      // Delete the section
      await Section.findByIdAndDelete(sectionId)
    }

    // Remove references so no page points at a deleted course
    await User.findByIdAndUpdate(course.instructor, { $pull: { courses: courseId } })
    if (course.category) {
      await Category.findByIdAndUpdate(course.category, { $pull: { courses: courseId } })
    }
    await CourseProgress.deleteMany({ courseID: courseId })

    // Delete the course
    await Course.findByIdAndDelete(courseId)

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    })
  }
}
const getFullCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body
    const userId = req.user.userId
    const courseDetails = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: `Could not find course with id: ${courseId}`,
      })
    }

    // Full content (video URLs) only for the course owner or an enrolled student
    const isOwner = String(courseDetails.instructor?._id) === String(userId)
    const isEnrolled = courseDetails.studentsEnrolled.some((id) => String(id) === String(userId))
    if (!isOwner && !isEnrolled) {
      return res.status(403).json({
        success: false,
        message: "Enrol in this course to access its lectures.",
      })
    }

    let courseProgressCount = await CourseProgress.findOne({
      courseID: courseId,
      userId: userId,
    })

    // if (courseDetails.status === "Draft") {
    //   return res.status(403).json({
    //     success: false,
    //     message: `Accessing a draft course is forbidden`,
    //   });
    // }

    let totalDurationInSeconds = 0
    courseDetails.courseContent.forEach((content) => {
      content.subSection.forEach((subSection) => {
        const timeDurationInSeconds = parseInt(subSection.timeDuration)
        totalDurationInSeconds += timeDurationInSeconds
      })
    })

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds)
    //  const totalDuration =1

    return res.status(200).json({
      success: true,
      data: {
        courseDetails,
        totalDuration,
        completedVideos: courseProgressCount?.completedVideos
          ? courseProgressCount?.completedVideos
          : [],
      },
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


// Edit Course Details
// const editCourse = async (req, res) => {
//   try {
//     const { courseId } = req.body
//     const updates = req.body
//     const course = await Course.findById(courseId)

//     if (!course) {
//       return res.status(404).json({ error: "Course not found" })
//     }

//     // If Thumbnail Image is found, update it
//     if (req.files) {
//       console.log("thumbnail update")
//       const thumbnail = req.files.thumbnailImage
//       const thumbnailImage = await uploadImageToCloudinary(
//         thumbnail,
//         process.env.FOLDER_NAME
//       )
//       course.thumbnail = thumbnailImage.url
//     }

//     // Update only the fields that are present in the request body
//     for (const key in updates) {
//       if (updates.hasOwnProperty(key)) {
//         if (key === "tag" || key === "instructions") {
//           course[key] = JSON.parse(updates[key])
//         } else {
//           course[key] = updates[key]
//         }
//       }
//     }

//     await course.save()

//     const updatedCourse = await Course.findOne({
//       _id: courseId,
//     })
//       .populate({
//         path: "instructor",
//         populate: {
//           path: "additionalDetails",
//         },
//       })
//       .populate("category")
//       .populate("ratingAndReviews")
//       .populate({
//         path: "courseContent",
//         populate: {
//           path: "subSection",
//         },
//       })
//       .exec()

//     res.json({
//       success: true,
//       message: "Course updated successfully",
//       data: updatedCourse,
//     })
//   } catch (error) {
//     console.error(error)
//     res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     })
//   }
// }

// Edit Course Details
const editCourse = async (req, res) => {
  try {
    const { courseId } = req.body
    const updates = req.body
    const course = await Course.findById(courseId)

    if (!course) {
      return res.status(404).json({ error: "Course not found" })
    }

    // If Thumbnail Image is found, update it
    if (req.files?.thumbnailImage) {
      const thumbnailImage = await uploadImageToCloudinary(
        req.files.thumbnailImage,
        process.env.FOLDER_NAME
      )
      if (thumbnailImage.success) course.thumbnail = thumbnailImage.url
    }

    // Only these fields may be edited. Owner, enrolled students, reviews and
    // content are never taken from the request.
    const EDITABLE = ["courseName", "courseDescription", "whatYouWillLearn", "price", "tags", "instructions", "status"]
    const JSON_FIELDS = ["tags", "instructions"]
    if (updates.price !== undefined) {
      const p = Number(updates.price)
      if (!Number.isInteger(p) || p < 0) {
        return res.status(400).json({ success: false, message: "Price must be a whole number of rupees, 0 or more." })
      }
    }
    for (const key of EDITABLE) {
      if (updates[key] === undefined) continue
      course[key] = JSON_FIELDS.includes(key) ? JSON.parse(updates[key]) : updates[key]
    }

    // Moving to another category: keep both category lists in sync
    if (updates.category && String(updates.category) !== String(course.category)) {
      const newCategory = await Category.findById(updates.category)
      if (!newCategory) {
        return res.status(404).json({ success: false, message: "Category not found" })
      }
      if (course.category) {
        await Category.findByIdAndUpdate(course.category, { $pull: { courses: course._id } })
      }
      await Category.findByIdAndUpdate(newCategory._id, { $addToSet: { courses: course._id } })
      course.category = newCategory._id
    }

    await course.save()

    const updatedCourse = await Course.findOne({
      _id: courseId,
    })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    res.json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    })
  }
}


module.exports = { createCourse, getAllCourses, searchCourses,getCourseDetails,editCourseStatus, getInstructorCourses,deleteCourse, getFullCourseDetails, editCourse };