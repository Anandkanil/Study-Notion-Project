const Profile = require("../models/Profile")
const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")

const User = require("../models/User")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const { convertSecondsToDuration } = require("../utils/secToDuration")

// Update User Profile
exports.updateProfile = async (req, res) => {
  const {firstName,lastName, gender, dateOfBirth, about, contactNumber } = req.body;
  const userId = req.user.userId;

  if (!contactNumber) {
    return res.status(400).json({
      success: false,
      message: "Contact number is required.",
    });
  }

  try {
    // Fetch user details
    const user = await User.findById(userId)
      .populate("additionalDetails")
      .select("-password -resetPasswordToken -resetPasswordExpires");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Prepare updated profile data
    const updatedProfileData = {
      gender: gender || user.additionalDetails.gender,
      dateOfBirth: dateOfBirth || user.additionalDetails.dateOfBirth,
      about: about || user.additionalDetails.about,
      contactNumber: contactNumber || user.additionalDetails.contactNumber,
    };

    //updating User FirstName and LastName
    await User.findByIdAndUpdate(userId,      
      { 
        firstName: firstName, 
        lastName: lastName, 
      },
      { new: true, runValidators: true });

    // Update profile in the database
    await Profile.findByIdAndUpdate(
      user.additionalDetails,
      updatedProfileData,
      { new: true, runValidators: true }
    );

    // Fetch the updated user details
    const updatedUserDetails = await User.findById(userId)
      .populate("additionalDetails")
      .select("-password -resetPasswordToken -resetPasswordExpires");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedUserDetails,
    });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete User Account
exports.deleteAccount = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Delete associated profile
    if (user.additionalDetails) {
      await Profile.findByIdAndDelete(user.additionalDetails);
    }

    // Delete user account
    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      success: true,
      message: "Account and profile deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting account:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the account.",
    });
  }
};

// Get Current User Details
exports.getCurrentUserDetails = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId)
      .populate("additionalDetails")
      .select("-password -resetPasswordToken -resetPasswordExpires");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
      message: "User details retrieved successfully.",
    });
  } catch (error) {
    console.error("Error retrieving user details:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving user details.",
    });
  }
};

// Get All Users
exports.getAllUserDetails = async (req, res) => {
  try {
    const users = await User.find()
      .populate("additionalDetails")
      .select("-password -resetPasswordToken -resetPasswordExpires");

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: users,
      message: "All user details retrieved successfully.",
    });
  } catch (error) {
    console.error("Error retrieving users:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving user details.",
    });
  }
};

// Update Display Picture
exports.updateDisplayPicture = async (req, res) => {
  try {
    const { displayPicture } = req.files;
    const userId = req.user.userId;

    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      1000,
      1000
    );

    if (!image || !image.url) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload the image.",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { image: image.url },
      { new: true }
    )
      .populate("additionalDetails")
      .select("-password -resetPasswordToken -resetPasswordExpires");

    return res.status(200).json({
      success: true,
      message: "Image updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating display picture:", error.message);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the display picture.",
    });
  }
};

// Get Enrolled Courses
exports.getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.userId
    let userDetails = await User.findOne({
      _id: userId,
    })
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
          populate: {
            path: "subSection",
          },
        },
      })
      .exec()
    userDetails = userDetails.toObject()
    var SubsectionLength = 0
    for (var i = 0; i < userDetails.courses.length; i++) {
      let totalDurationInSeconds = 0
      SubsectionLength = 0
      for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
        totalDurationInSeconds += userDetails.courses[i].courseContent[
          j
        ].subSection.reduce((acc, curr) => acc + parseInt(curr.timeDuration), 0)
        userDetails.courses[i].totalDuration = convertSecondsToDuration(
          totalDurationInSeconds
        )
        SubsectionLength +=
          userDetails.courses[i].courseContent[j].subSection.length
      }
      let courseProgressCount = await CourseProgress.findOne({
        courseID: userDetails.courses[i]._id,
        userId: userId,
      })
      courseProgressCount = courseProgressCount?.completedVideos.length
      if (SubsectionLength === 0) {
        userDetails.courses[i].progressPercentage = 100
      } else {
        // To make it up to 2 decimal point
        const multiplier = Math.pow(10, 2)
        userDetails.courses[i].progressPercentage =
          Math.round(
            (courseProgressCount / SubsectionLength) * 100 * multiplier
          ) / multiplier
      }
    }

    if (!userDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find user with id: ${userDetails}`,
      })
    }
    return res.status(200).json({
      success: true,
      data: userDetails.courses,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

//Instructor DashBoard controller
exports.instructorDashboard=async(req,res)=>{
  try {
    const userId=req.user.userId;
    const instructorCourses=await Course.find({instructor:userId});
    const dashBoardData=instructorCourses.map((course)=>{
       const totalStudentsEnrolled=course.studentsEnrolled.length;
       const totalAmountGenerated=totalStudentsEnrolled*course.price;

       //Creating a new Object with additional Feilds
       const courseDataWithStats={
        _id:course._id,
        courseName:course.courseName,
        courseDescription:course.courseDescription,
        totalStudentsEnrolled,
        totalAmountGenerated
       };
       return courseDataWithStats;
    })
    res.status(200).json({
      success:true,
      courses:dashBoardData,
      message:"Succesfully retreived DashBoard Data"
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success:false,
      message:"Internal Server error",error});
  }
}