const mongoose = require("mongoose");
const Course = require("../models/Course");
const Section = require("../models/Section");

const isId = (v) => typeof v === "string" && mongoose.Types.ObjectId.isValid(v);

/**
 * Allows the request only when the logged-in instructor owns the course it touches.
 * The course is found from `courseId`, or from `sectionId` when only that is sent.
 * If `subSectionId` is sent, it must belong to `sectionId`.
 * Must run after `auth` and `isInstructor`.
 */
async function requireCourseOwner(req, res, next) {
  try {
    const { courseId, sectionId, subSectionId } = req.body || {};

    let course = null;
    if (sectionId) {
      if (!isId(sectionId)) return res.status(400).json({ success: false, message: "Invalid section id." });
      course = await Course.findOne({ courseContent: sectionId }).select("instructor");
      if (courseId && course && String(course._id) !== String(courseId)) {
        return res.status(400).json({ success: false, message: "Section does not belong to this course." });
      }
    } else if (courseId) {
      if (!isId(courseId)) return res.status(400).json({ success: false, message: "Invalid course id." });
      course = await Course.findById(courseId).select("instructor");
    } else {
      return res.status(400).json({ success: false, message: "Course or section id is required." });
    }

    if (!course) return res.status(404).json({ success: false, message: "Course not found." });

    if (String(course.instructor) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "You can only change your own courses." });
    }

    if (subSectionId) {
      if (!isId(subSectionId)) return res.status(400).json({ success: false, message: "Invalid lecture id." });
      const owns = await Section.exists({ _id: sectionId, subSection: subSectionId });
      if (!owns) return res.status(400).json({ success: false, message: "Lecture does not belong to this section." });
    }

    req.course = course;
    next();
  } catch (error) {
    console.error("Ownership check failed:", error.message);
    return res.status(500).json({ success: false, message: "Could not verify course ownership." });
  }
}

module.exports = { requireCourseOwner };
