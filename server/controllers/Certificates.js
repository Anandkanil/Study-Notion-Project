/*
 * Course-completion certificates.
 *   GET /profile/certificates/:courseId  (student) — the learner's certificate, issued the
 *        first time it's asked for once every lesson is complete
 *   GET /course/certificates/verify/:code  (public) — confirms a certificate is genuine
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');
const User = require('../models/User');
const { convertSecondsToDuration } = require('../utils/secToDuration');

// No 0/O or 1/I, so a code read off paper can be typed back without mistakes
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const newCode = () => {
  const bytes = crypto.randomBytes(8);
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
  return `SN-${chars.slice(0, 4)}-${chars.slice(4)}`;
};
const CODE_RE = /^SN-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

const publicView = (c) => ({
  code: c.code, learnerName: c.learnerName, courseName: c.courseName, instructorName: c.instructorName || '',
  lessons: c.lessons || 0, totalDuration: c.totalDuration || '', issuedAt: c.issuedAt, courseId: String(c.course),
});

exports.mine = async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.userId;
  if (!mongoose.Types.ObjectId.isValid(String(courseId))) return res.status(400).json({ success: false, message: 'Invalid course.' });
  try {
    const existing = await Certificate.findOne({ user: userId, course: courseId }).lean();
    if (existing) return res.status(200).json({ success: true, data: publicView(existing) });

    const course = await Course.findById(courseId)
      .select('courseName courseContent instructor')
      .populate({ path: 'courseContent', select: 'subSection', populate: { path: 'subSection', select: 'timeDuration' } })
      .populate('instructor', 'firstName lastName')
      .lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    const lessons = (course.courseContent || []).flatMap((s) => s.subSection || []);
    const progress = await CourseProgress.findOne({ courseID: courseId, userId }).lean();
    if (!progress) return res.status(404).json({ success: false, enrolled: false, message: "You're not enrolled in this course." });
    const done = new Set((progress.completedVideos || []).map(String));
    const finished = lessons.length > 0 && lessons.every((l) => done.has(String(l._id)));
    if (!finished) {
      return res.status(200).json({ success: true, data: null, progress: lessons.length ? Math.round((lessons.filter((l) => done.has(String(l._id))).length / lessons.length) * 100) : 0 });
    }

    const user = await User.findById(userId).select('firstName lastName').lean();
    const seconds = lessons.reduce((n, l) => n + (parseInt(l.timeDuration, 10) || 0), 0);
    const fields = {
      user: userId, course: courseId,
      learnerName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'StudyNotion learner',
      courseName: course.courseName,
      instructorName: [course.instructor?.firstName, course.instructor?.lastName].filter(Boolean).join(' '),
      lessons: lessons.length,
      totalDuration: seconds ? convertSecondsToDuration(seconds) : '',
    };
    // A code clash is astronomically unlikely, but retry rather than fail
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const cert = await Certificate.create({ ...fields, code: newCode() });
        return res.status(200).json({ success: true, data: publicView(cert) });
      } catch (e) {
        if (e.code !== 11000) throw e;
        const raced = await Certificate.findOne({ user: userId, course: courseId }).lean();
        if (raced) return res.status(200).json({ success: true, data: publicView(raced) });
      }
    }
    throw new Error('Could not issue a certificate code');
  } catch (error) {
    console.error('Certificate:', error.message);
    return res.status(500).json({ success: false, message: "Your certificate couldn't load. Please try again." });
  }
};

exports.verify = async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!CODE_RE.test(code)) return res.status(404).json({ success: false, message: 'No certificate has this code.' });
  try {
    const cert = await Certificate.findOne({ code }).lean();
    if (!cert) return res.status(404).json({ success: false, message: 'No certificate has this code.' });
    return res.status(200).json({ success: true, data: publicView(cert) });
  } catch (error) {
    console.error('Certificate verify:', error.message);
    return res.status(500).json({ success: false, message: "Couldn't check this certificate right now. Please try again." });
  }
};

exports._test = { newCode, CODE_RE };
