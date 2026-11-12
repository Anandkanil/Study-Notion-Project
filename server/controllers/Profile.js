const Profile = require("../models/Profile")
const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")
const RatingAndReview = require("../models/RatingAndReview")

const User = require("../models/User")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const { convertSecondsToDuration } = require("../utils/secToDuration")

// Update User Profile
exports.updateProfile = async (req, res) => {
  const {firstName,lastName, gender, dateOfBirth, about, contactNumber } = req.body;
  const userId = req.user.userId;

  if (contactNumber && !/^\+?[0-9]{10,13}$/.test(String(contactNumber))) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid phone number (10 to 13 digits).",
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

    // Instructors must remove their courses first, so enrolled students never lose access silently
    if (user.accountType === "Instructor") {
      const ownCourses = await Course.countDocuments({ instructor: userId });
      if (ownCourses > 0) {
        return res.status(409).json({
          success: false,
          message: `Please delete your ${ownCourses} course${ownCourses === 1 ? "" : "s"} before deleting your account.`,
        });
      }
    }

    // Remove the user from every course, with their progress and reviews
    const reviews = await RatingAndReview.find({ user: userId }).select("_id");
    const reviewIds = reviews.map((r) => r._id);
    await Course.updateMany(
      { $or: [{ studentsEnrolled: userId }, { ratingAndReviews: { $in: reviewIds } }] },
      { $pull: { studentsEnrolled: userId, ratingAndReviews: { $in: reviewIds } } }
    );
    await RatingAndReview.deleteMany({ user: userId });
    await CourseProgress.deleteMany({ userId });

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
    const displayPicture = req.files?.displayPicture;
    const userId = req.user.userId;

    if (!displayPicture || Array.isArray(displayPicture)) {
      return res.status(400).json({ success: false, message: "Choose one image to upload." });
    }
    if (!/^image\/(jpeg|png|gif|webp)$/.test(displayPicture.mimetype || "")) {
      return res.status(400).json({ success: false, message: "Use a JPG, PNG, GIF or WebP image." });
    }
    if (displayPicture.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "That image is over 5 MB. Choose a smaller one." });
    }

    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      1000,
      1000
    );

    if (!image || !image.url) {
      return res.status(500).json({
        success: false,
        message: "Your photo couldn't be uploaded. Please try again.",
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
      message: "Profile photo updated",
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
      userDetails.courses[i].completedVideos = (courseProgressCount?.completedVideos || []).map(String)
      courseProgressCount = courseProgressCount?.completedVideos.length || 0
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

    // The learner's own rating per course, so the site knows whether to ask for one
    const myRatings = await RatingAndReview.find({
      user: userId,
      course: { $in: userDetails.courses.map((c) => c._id) },
    }).select('course rating').lean()
    const ratingByCourse = new Map(myRatings.map((r) => [String(r.course), r.rating]))
    userDetails.courses.forEach((c) => {
      c.myRating = ratingByCourse.get(String(c._id)) || null
    })

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
// ---- Wishlist (students) ----
const { summarize } = require("../utils/learningDays")
const CourseModel = require("../models/Course")
const isObjectId = (id) => /^[a-f0-9]{24}$/i.test(String(id || ""))

// GET /profile/wishlist: saved courses that are still published, newest first
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("wishlist")
      .populate({
        path: "wishlist",
        match: { status: "Published" },
        select: "courseName thumbnail price instructor ratingAndReviews",
        populate: [{ path: "instructor", select: "firstName lastName" }, { path: "ratingAndReviews", select: "rating" }],
      })
      .lean()
    const list = (user?.wishlist || []).filter(Boolean).reverse()
    return res.status(200).json({ success: true, data: list })
  } catch (error) {
    console.error("getWishlist:", error.message)
    return res.status(500).json({ success: false, message: "Your wishlist couldn't load. Please try again." })
  }
}

// POST /profile/wishlist { courseId } — save a course
exports.addToWishlist = async (req, res) => {
  const { courseId } = req.body || {}
  if (!isObjectId(courseId)) return res.status(400).json({ success: false, message: "Invalid course." })
  try {
    const course = await CourseModel.findOne({ _id: courseId, status: "Published" }).select("_id studentsEnrolled").lean()
    if (!course) return res.status(404).json({ success: false, message: "That course isn't available." })
    if ((course.studentsEnrolled || []).some((id) => String(id) === String(req.user.userId))) {
      return res.status(409).json({ success: false, message: "You're already enrolled in this course." })
    }
    const user = await User.findByIdAndUpdate(req.user.userId, { $addToSet: { wishlist: courseId } }, { new: true }).select("wishlist").lean()
    return res.status(200).json({ success: true, message: "Saved to your wishlist", data: (user?.wishlist || []).map(String) })
  } catch (error) {
    console.error("addToWishlist:", error.message)
    return res.status(500).json({ success: false, message: "Couldn't save the course. Please try again." })
  }
}

// DELETE /profile/wishlist/:courseId — remove a saved course
exports.removeFromWishlist = async (req, res) => {
  const { courseId } = req.params
  if (!isObjectId(courseId)) return res.status(400).json({ success: false, message: "Invalid course." })
  try {
    const user = await User.findByIdAndUpdate(req.user.userId, { $pull: { wishlist: courseId } }, { new: true }).select("wishlist").lean()
    return res.status(200).json({ success: true, message: "Removed from your wishlist", data: (user?.wishlist || []).map(String) })
  } catch (error) {
    console.error("removeFromWishlist:", error.message)
    return res.status(500).json({ success: false, message: "Couldn't remove the course. Please try again." })
  }
}

// ---- Learning streaks and weekly goal (students) ----

// GET /profile/learning-stats
exports.getLearningStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("learningDays weeklyGoal").lean()
    return res.status(200).json({ success: true, data: summarize(user?.learningDays || [], user?.weeklyGoal || 3) })
  } catch (error) {
    console.error("getLearningStats:", error.message)
    return res.status(500).json({ success: false, message: "Your progress couldn't load." })
  }
}

// PUT /profile/weekly-goal { goal }
exports.setWeeklyGoal = async (req, res) => {
  const goal = Number(req.body?.goal)
  if (!Number.isInteger(goal) || goal < 1 || goal > 50) {
    return res.status(400).json({ success: false, message: "Pick a goal between 1 and 50 lessons a week." })
  }
  try {
    const user = await User.findByIdAndUpdate(req.user.userId, { weeklyGoal: goal }, { new: true }).select("learningDays weeklyGoal").lean()
    return res.status(200).json({ success: true, message: `Goal set: ${goal} ${goal === 1 ? "lesson" : "lessons"} a week`, data: summarize(user?.learningDays || [], goal) })
  } catch (error) {
    console.error("setWeeklyGoal:", error.message)
    return res.status(500).json({ success: false, message: "Your goal couldn't be saved. Please try again." })
  }
}
