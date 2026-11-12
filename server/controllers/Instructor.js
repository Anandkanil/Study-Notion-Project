/*
 * Instructor tools for one course: stats, review replies, announcements, discount codes.
 * Every handler checks the logged-in instructor owns the course it touches.
 */
const mongoose = require('mongoose');
const Course = require('../models/Course');
const CourseProgress = require('../models/CourseProgress');
const Purchase = require('../models/Purchase');
const RatingAndReview = require('../models/RatingAndReview');
const Announcement = require('../models/Announcement');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const mailSender = require('../utils/mailSender');
const { announcementEmail } = require('../mail/templates/announcementEmail');
const { normalize } = require('../utils/coupons');

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ANNOUNCEMENT_EMAIL_CAP = 50; // Brevo's free plan sends 300 emails a day across the whole site

const fail = (res, error, message) => {
  console.error(`Instructor: ${message}:`, error?.message || error);
  return res.status(500).json({ success: false, message: `${message}. Please try again.` });
};

/** The course if this instructor owns it, otherwise sends 400/404 and returns null. */
async function ownedCourse(req, res, courseId, select = 'courseName instructor') {
  if (!isId(courseId)) {
    res.status(400).json({ success: false, message: 'Invalid course.' });
    return null;
  }
  const course = await Course.findOne({ _id: courseId, instructor: req.user.userId }).select(select).lean();
  if (!course) {
    res.status(404).json({ success: false, message: "That course isn't one of yours." });
    return null;
  }
  return course;
}

// GET /instructor/courses/:courseId/stats
exports.getCourseStats = async (req, res) => {
  try {
    const course = await ownedCourse(req, res, req.params.courseId, 'courseName status price studentsEnrolled courseContent createdAt');
    if (!course) return;
    const full = await Course.findById(course._id)
      .select('courseContent')
      .populate({ path: 'courseContent', select: 'sectionName subSection', populate: { path: 'subSection', select: 'title' } })
      .lean();
    const lessons = (full.courseContent || []).flatMap((s) => (s.subSection || []).map((l) => ({ id: String(l._id), title: l.title, section: s.sectionName })));

    const since = new Date();
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCMonth(since.getUTCMonth() - 11);

    const courseOid = new mongoose.Types.ObjectId(String(course._id));
    const [progress, sales, salesByMonth, ratings] = await Promise.all([
      CourseProgress.find({ courseID: course._id }).select('completedVideos').lean(),
      Purchase.aggregate([
        { $match: { 'refund.id': { $exists: false } } },
        { $unwind: '$courses' },
        { $match: { 'courses.course': courseOid } },
        { $group: { _id: null, revenue: { $sum: { $ifNull: ['$courses.price', 0] } }, orders: { $sum: 1 } } },
      ]),
      Purchase.aggregate([
        { $match: { createdAt: { $gte: since }, 'refund.id': { $exists: false } } },
        { $unwind: '$courses' },
        { $match: { 'courses.course': courseOid } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, revenue: { $sum: { $ifNull: ['$courses.price', 0] } }, sales: { $sum: 1 } } },
      ]),
      RatingAndReview.find({ course: course._id, hidden: { $ne: true } }).select('rating').lean(),
    ]);

    const students = (course.studentsEnrolled || []).length;
    const lessonIds = new Set(lessons.map((l) => l.id));
    const doneCounts = progress.map((p) => (p.completedVideos || []).filter((id) => lessonIds.has(String(id))).length);
    const finished = lessons.length ? doneCounts.filter((n) => n >= lessons.length).length : 0;
    const avgCompletion = progress.length && lessons.length ? Math.round((doneCounts.reduce((a, b) => a + b, 0) / (progress.length * lessons.length)) * 100) : 0;
    // Share of students who finished each lesson, in course order: where people stop
    const perLesson = lessons.map((l) => ({
      ...l,
      completed: progress.filter((p) => (p.completedVideos || []).some((id) => String(id) === l.id)).length,
    }));

    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(since);
      d.setUTCMonth(since.getUTCMonth() + i);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const r = salesByMonth.find((x) => x._id.y === y && x._id.m === m);
      months.push({ year: y, month: m, revenue: r?.revenue || 0, sales: r?.sales || 0 });
    }

    return res.status(200).json({
      success: true,
      data: {
        course: { _id: course._id, courseName: course.courseName, status: course.status, price: course.price },
        totals: {
          students,
          revenue: sales[0]?.revenue || 0,
          orders: sales[0]?.orders || 0,
          finished,
          avgCompletion,
          rating: ratings.length ? Math.round((ratings.reduce((n, r) => n + r.rating, 0) / ratings.length) * 10) / 10 : null,
          ratings: ratings.length,
        },
        months,
        lessons: perLesson,
        tracked: progress.length,
      },
    });
  } catch (error) {
    return fail(res, error, "Stats couldn't load");
  }
};

// ---- Reviews and replies ----

exports.listReviews = async (req, res) => {
  try {
    const course = await ownedCourse(req, res, req.params.courseId);
    if (!course) return;
    const reviews = await RatingAndReview.find({ course: course._id })
      .sort({ createdAt: -1 })
      .populate('user', 'firstName lastName image')
      .select('rating review reply hidden createdAt user')
      .lean();
    return res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    return fail(res, error, "Reviews couldn't load");
  }
};

async function ownedReview(req, res) {
  if (!isId(req.params.reviewId)) {
    res.status(400).json({ success: false, message: 'Invalid review.' });
    return null;
  }
  const review = await RatingAndReview.findById(req.params.reviewId).select('course');
  if (!review) {
    res.status(404).json({ success: false, message: 'That review no longer exists.' });
    return null;
  }
  const course = await Course.findOne({ _id: review.course, instructor: req.user.userId }).select('_id').lean();
  if (!course) {
    res.status(403).json({ success: false, message: 'You can only reply to reviews of your own courses.' });
    return null;
  }
  return review;
}

// PUT /instructor/reviews/:reviewId/reply { text }
exports.replyToReview = async (req, res) => {
  const text = str(req.body?.text, 1000);
  if (text.length < 2) return res.status(400).json({ success: false, message: 'Write a reply first.' });
  try {
    const review = await ownedReview(req, res);
    if (!review) return;
    const saved = await RatingAndReview.findByIdAndUpdate(review._id, { reply: { text, at: new Date() } }, { new: true }).select('reply').lean();
    return res.status(200).json({ success: true, message: 'Reply posted', data: saved.reply });
  } catch (error) {
    return fail(res, error, "Your reply couldn't be posted");
  }
};

// DELETE /instructor/reviews/:reviewId/reply
exports.deleteReply = async (req, res) => {
  try {
    const review = await ownedReview(req, res);
    if (!review) return;
    await RatingAndReview.findByIdAndUpdate(review._id, { $unset: { reply: 1 } });
    return res.status(200).json({ success: true, message: 'Reply removed' });
  } catch (error) {
    return fail(res, error, "Your reply couldn't be removed");
  }
};

// ---- Announcements ----

exports.listAnnouncementsForInstructor = async (req, res) => {
  try {
    const course = await ownedCourse(req, res, req.params.courseId);
    if (!course) return;
    const list = await Announcement.find({ course: course._id }).sort({ createdAt: -1 }).select('title body emailedTo createdAt').lean();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return fail(res, error, "Announcements couldn't load");
  }
};

// POST /instructor/courses/:courseId/announcements { title, body, email }
exports.createAnnouncement = async (req, res) => {
  const title = str(req.body?.title, 120);
  const body = str(req.body?.body, 2000);
  if (title.length < 3) return res.status(400).json({ success: false, message: 'Give the announcement a title (at least 3 characters).' });
  if (body.length < 10) return res.status(400).json({ success: false, message: 'Write a message of at least 10 characters.' });
  try {
    const course = await ownedCourse(req, res, req.params.courseId, 'courseName instructor studentsEnrolled');
    if (!course) return;
    let emailedTo = 0;
    let note = '';
    if (req.body?.email) {
      const students = await User.find({ _id: { $in: course.studentsEnrolled || [] } }).select('email firstName').limit(ANNOUNCEMENT_EMAIL_CAP).lean();
      const teacher = await User.findById(req.user.userId).select('firstName lastName').lean();
      const from = [teacher?.firstName, teacher?.lastName].filter(Boolean).join(' ');
      students.forEach((s) => mailSender.inBackground(s.email, `${course.courseName}: ${title}`, announcementEmail(s.firstName, from, course.courseName, title, body, String(course._id))));
      emailedTo = students.length;
      if ((course.studentsEnrolled || []).length > ANNOUNCEMENT_EMAIL_CAP) note = ` Emailed the first ${ANNOUNCEMENT_EMAIL_CAP}; everyone sees it in the course.`;
    }
    const a = await Announcement.create({ course: course._id, instructor: req.user.userId, title, body, emailedTo });
    const message = emailedTo ? `Announcement posted and emailed to ${emailedTo} ${emailedTo === 1 ? 'student' : 'students'}.${note}` : 'Announcement posted';
    return res.status(201).json({ success: true, message, data: { _id: a._id, title, body, emailedTo, createdAt: a.createdAt } });
  } catch (error) {
    return fail(res, error, "The announcement couldn't be posted");
  }
};

// DELETE /instructor/announcements/:id
exports.deleteAnnouncement = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid announcement.' });
  try {
    const gone = await Announcement.findOneAndDelete({ _id: req.params.id, instructor: req.user.userId });
    if (!gone) return res.status(404).json({ success: false, message: 'That announcement no longer exists.' });
    return res.status(200).json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    return fail(res, error, "The announcement couldn't be deleted");
  }
};

// GET /course/:courseId/announcements — for enrolled students (and the instructor)
exports.listAnnouncementsForCourse = async (req, res) => {
  const { courseId } = req.params;
  if (!isId(courseId)) return res.status(400).json({ success: false, message: 'Invalid course.' });
  try {
    const course = await Course.findById(courseId).select('instructor studentsEnrolled').lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    const me = String(req.user.userId);
    const allowed = String(course.instructor) === me || (course.studentsEnrolled || []).some((id) => String(id) === me);
    if (!allowed) return res.status(403).json({ success: false, message: 'Announcements are for enrolled students.' });
    const list = await Announcement.find({ course: courseId }).sort({ createdAt: -1 }).limit(20).select('title body createdAt').lean();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return fail(res, error, "Announcements couldn't load");
  }
};

// ---- Discount codes ----

exports.listCoupons = async (req, res) => {
  try {
    const course = await ownedCourse(req, res, req.params.courseId);
    if (!course) return;
    const list = await Coupon.find({ course: course._id }).sort({ createdAt: -1 }).select('code percentOff expiresAt maxUses uses active createdAt').lean();
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return fail(res, error, "Discount codes couldn't load");
  }
};

// POST /instructor/courses/:courseId/coupons { code, percentOff, expiresAt?, maxUses? }
exports.createCoupon = async (req, res) => {
  const code = normalize(req.body?.code);
  const percentOff = Number(req.body?.percentOff);
  const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;
  const maxUses = req.body?.maxUses === '' || req.body?.maxUses == null ? null : Number(req.body.maxUses);
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return res.status(400).json({ success: false, message: 'Codes are 3–20 letters, numbers, - or _.' });
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 90) return res.status(400).json({ success: false, message: 'The discount must be a whole number from 1 to 90%.' });
  if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date())) return res.status(400).json({ success: false, message: 'Pick an expiry date in the future, or leave it empty.' });
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000)) return res.status(400).json({ success: false, message: 'The use limit must be a whole number, or empty for unlimited.' });
  try {
    const course = await ownedCourse(req, res, req.params.courseId);
    if (!course) return;
    if (await Coupon.exists({ code, course: course._id })) return res.status(409).json({ success: false, message: `${code} already exists for this course.` });
    const c = await Coupon.create({ code, course: course._id, instructor: req.user.userId, percentOff, expiresAt, maxUses });
    return res.status(201).json({ success: true, message: `${code} created: ${percentOff}% off`, data: c });
  } catch (error) {
    return fail(res, error, "The code couldn't be created");
  }
};

// PATCH /instructor/coupons/:id { active }
exports.setCouponActive = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid code.' });
  const active = req.body?.active === true;
  try {
    const c = await Coupon.findOneAndUpdate({ _id: req.params.id, instructor: req.user.userId }, { active }, { new: true }).lean();
    if (!c) return res.status(404).json({ success: false, message: 'That code no longer exists.' });
    return res.status(200).json({ success: true, message: active ? `${c.code} switched on` : `${c.code} switched off`, data: c });
  } catch (error) {
    return fail(res, error, "The code couldn't be updated");
  }
};
