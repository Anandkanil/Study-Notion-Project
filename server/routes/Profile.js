const express = require("express")
const router = express.Router()
const { auth, isInstructor, isStudent } = require("../middlewares/auth")
const {
  deleteAccount,
  updateProfile,
  getCurrentUserDetails,
  updateDisplayPicture,
  getEnrolledCourses,
  instructorDashboard,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getLearningStats,
  setWeeklyGoal,
  getSavedLessons,
  saveLesson,
  unsaveLesson,
  setLastLesson,
} = require("../controllers/Profile")

// ********************************************************************************************************
//                                      Profile routes
// ********************************************************************************************************
// Delete User Account
router.delete("/deleteProfile", auth, deleteAccount)
router.put("/updateProfile", auth, updateProfile)
router.get("/getUserDetails", auth, getCurrentUserDetails)
// Get Enrolled Courses
router.get("/getEnrolledCourses", auth, getEnrolledCourses)
router.put("/updateDisplayPicture", auth, updateDisplayPicture)
router.get("/instructorDashboard", auth, isInstructor, instructorDashboard)

// Students: wishlist, streaks and weekly goal
router.get("/wishlist", auth, isStudent, getWishlist)
router.post("/wishlist", auth, isStudent, addToWishlist)
router.delete("/wishlist/:courseId", auth, isStudent, removeFromWishlist)
router.get("/learning-stats", auth, isStudent, getLearningStats)
router.put("/last-lesson", auth, isStudent, setLastLesson)
router.get("/saved-lessons", auth, isStudent, getSavedLessons)
router.post("/saved-lessons", auth, isStudent, saveLesson)
router.delete("/saved-lessons/:subSectionId", auth, isStudent, unsaveLesson)
router.put("/weekly-goal", auth, isStudent, setWeeklyGoal)

module.exports = router