const mongoose = require("mongoose")
const notify = require("../utils/notify")
const Section = require("../models/Section")
const SubSection = require("../models/SubSection")
const CourseProgress = require("../models/CourseProgress")
const Course = require("../models/Course")

const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const { courseCompletionEmail } = require("../mail/templates/courseCompletionEmail")
const { recordLesson, summarize } = require("../utils/learningDays")

const FRONTEND_URL = (process.env.FRONTEND_URL || "https://studynotion-project-1.netlify.app").replace(/\/$/, "")

// What changed for the learner with this lesson, so the player can celebrate it.
// firstToday: the first lesson of the day (the streak just grew).
// newBest: the streak beat the previous longest run. goalReached: the weekly goal was just met.
function streakUpdate(before, after) {
  return {
    currentStreak: after.currentStreak,
    bestStreak: after.bestStreak,
    firstToday: !before.learnedToday,
    newBest: !before.learnedToday && after.currentStreak > 1 && after.currentStreak > before.bestStreak,
    thisWeek: after.thisWeek,
    weeklyGoal: after.weeklyGoal,
    goalReached: before.thisWeek < after.weeklyGoal && after.thisWeek >= after.weeklyGoal,
  }
}
exports._streakUpdate = streakUpdate

// Marks one lesson as finished. Also logs the day for streaks, and emails the
// certificate link the first time every lesson in the course is done.
exports.updateCourseProgress = async (req, res) => {
  const { courseId, subsectionId } = req.body || {}
  const userId = req.user.userId

  if (!mongoose.Types.ObjectId.isValid(String(courseId)) || !mongoose.Types.ObjectId.isValid(String(subsectionId))) {
    return res.status(400).json({ success: false, message: "Invalid lesson." })
  }

  try {
    // The lesson must belong to this course
    const course = await Course.findById(courseId)
      .select("courseName courseContent")
      .populate({ path: "courseContent", select: "subSection" })
      .lean()
    if (!course) return res.status(404).json({ success: false, message: "Course not found." })
    const lessonIds = (course.courseContent || []).flatMap((s) => (s.subSection || []).map(String))
    if (!lessonIds.includes(String(subsectionId))) {
      return res.status(400).json({ success: false, message: "That lesson isn't part of this course." })
    }

    const courseProgress = await CourseProgress.findOne({ courseID: courseId, userId })
    if (!courseProgress) {
      return res.status(404).json({ success: false, message: "You're not enrolled in this course." })
    }
    if (courseProgress.completedVideos.map(String).includes(String(subsectionId))) {
      return res.status(200).json({ success: true, message: "Already completed", completedCourse: false })
    }

    const wasComplete = lessonIds.every((id) => courseProgress.completedVideos.map(String).includes(id))
    courseProgress.completedVideos.push(subsectionId)
    await courseProgress.save()

    const done = new Set(courseProgress.completedVideos.map(String))
    const completedCourse = !wasComplete && lessonIds.every((id) => done.has(id))

    // Streaks: count today's lesson (best effort; never blocks the progress save)
    const user = await User.findById(userId).select("learningDays weeklyGoal firstName email")
    let streak = null
    if (user) {
      const before = summarize(user.learningDays || [], user.weeklyGoal || 3)
      user.learningDays = recordLesson(user.learningDays)
      streak = streakUpdate(before, summarize(user.learningDays, user.weeklyGoal || 3))
      await user.save().catch((e) => console.error("learningDays save:", e.message))
      if (completedCourse) {
        notify(userId, { type: 'completed', title: `You finished ${course.courseName}`, body: 'Your certificate is ready to download.', link: `/dashboard/certificate/${courseId}` })
        mailSender.inBackground(
          user.email,
          `You finished ${course.courseName}`,
          courseCompletionEmail(user.firstName, course.courseName, `${FRONTEND_URL}/dashboard/certificate/${courseId}`)
        )
      }
    }

    return res.status(200).json({ success: true, message: "Course progress updated", completedCourse, streak })
  } catch (error) {
    console.error("updateCourseProgress:", error.message)
    return res.status(500).json({ success: false, message: "Couldn't save your progress. Please try again." })
  }
}

// exports.getProgressPercentage = async (req, res) => {
//   const { courseId } = req.body
//   const userId = req.user.id

//   if (!courseId) {
//     return res.status(400).json({ error: "Course ID not provided." })
//   }

//   try {
//     // Find the course progress document for the user and course
//     let courseProgress = await CourseProgress.findOne({
//       courseID: courseId,
//       userId: userId,
//     })
//       .populate({
//         path: "courseID",
//         populate: {
//           path: "courseContent",
//         },
//       })
//       .exec()

//     if (!courseProgress) {
//       return res
//         .status(400)
//         .json({ error: "Can not find Course Progress with these IDs." })
//     }
//     console.log(courseProgress, userId)
//     let lectures = 0
//     courseProgress.courseID.courseContent?.forEach((sec) => {
//       lectures += sec.subSection.length || 0
//     })

//     let progressPercentage =
//       (courseProgress.completedVideos.length / lectures) * 100

//     // To make it up to 2 decimal point
//     const multiplier = Math.pow(10, 2)
//     progressPercentage =
//       Math.round(progressPercentage * multiplier) / multiplier

//     return res.status(200).json({
//       data: progressPercentage,
//       message: "Succesfully fetched Course progress",
//     })
//   } catch (error) {
//     console.error(error)
//     return res.status(500).json({ error: "Internal server error" })
//   }
// }
