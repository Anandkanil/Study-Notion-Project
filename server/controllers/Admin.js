/*
 * Admin-only endpoints for the admin panel. Every route is behind auth + isAdmin.
 * Responses carry only what the screens show: no passwords, tokens or video URLs.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Category = require('../models/Category');
const Purchase = require('../models/Purchase');
const RatingAndReview = require('../models/RatingAndReview');
const CourseProgress = require('../models/CourseProgress');
const AdminLog = require('../models/AdminLog');
const instance = require('../config/Razorpay');
const mailSender = require('../utils/mailSender');
const adminLog = require('../utils/adminLog');
const { forgetSuspension } = require('../middlewares/auth');
const { courseReviewEmail, refundEmail, suspensionEmail } = require('../mail/templates/adminEmails');

const fail = (res, error, message) => {
  console.error(`Admin: ${message}:`, error?.message || error);
  return res.status(500).json({ success: false, message: `${message}. Please try again.` });
};
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));
const str = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// GET /admin/overview — headline numbers, revenue by month, top courses, recent sales
exports.getOverview = async (req, res) => {
  try {
    const since = new Date();
    since.setUTCDate(1);
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCMonth(since.getUTCMonth() - 11); // this month + previous 11

    const [students, instructors, published, drafts, pending, totals, byMonth, signupsByMonth, topCourses, recent] = await Promise.all([
      User.countDocuments({ accountType: 'Student' }),
      User.countDocuments({ accountType: 'Instructor' }),
      Course.countDocuments({ status: 'Published' }),
      Course.countDocuments({ status: 'Draft' }),
      Course.countDocuments({ status: 'Pending' }),
      Purchase.aggregate([{ $match: { refund: { $exists: false } } }, { $group: { _id: null, revenue: { $sum: '$amount' }, orders: { $sum: 1 } } }]),
      Purchase.aggregate([
        { $match: { createdAt: { $gte: since }, refund: { $exists: false } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, revenue: { $sum: '$amount' }, orders: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: since }, accountType: 'Student' } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      Purchase.aggregate([
        { $match: { refund: { $exists: false } } },
        { $unwind: '$courses' },
        { $group: { _id: '$courses.course', courseName: { $last: '$courses.courseName' }, revenue: { $sum: { $ifNull: ['$courses.price', 0] } }, sales: { $sum: 1 } } },
        { $sort: { revenue: -1, sales: -1 } },
        { $limit: 5 },
      ]),
      Purchase.find().sort({ createdAt: -1 }).limit(6).populate('user', 'firstName lastName email').select('courses amount createdAt orderId user').lean(),
    ]);

    // A slot for every month, so empty months show as zero instead of disappearing
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(since);
      d.setUTCMonth(since.getUTCMonth() + i);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() + 1;
      const r = byMonth.find((x) => x._id.y === y && x._id.m === m);
      const s = signupsByMonth.find((x) => x._id.y === y && x._id.m === m);
      months.push({ year: y, month: m, revenue: r?.revenue || 0, orders: r?.orders || 0, signups: s?.count || 0 });
    }

    return res.status(200).json({
      success: true,
      data: {
        totals: {
          revenue: totals[0]?.revenue || 0,
          orders: totals[0]?.orders || 0,
          students,
          instructors,
          publishedCourses: published,
          draftCourses: drafts,
          pendingCourses: pending,
        },
        months,
        topCourses: topCourses.map((c) => ({ courseId: c._id, courseName: c.courseName, revenue: c.revenue, sales: c.sales })),
        recentPurchases: recent,
      },
    });
  } catch (error) {
    return fail(res, error, "The overview couldn't load");
  }
};

// ---- Subjects (categories) ----

exports.listCategories = async (req, res) => {
  try {
    const categories = await Category.find().select('name description courses createdAt').sort({ name: 1 }).lean();
    const data = categories.map((c) => ({ _id: c._id, name: c.name, description: c.description || '', courseCount: (c.courses || []).length, createdAt: c.createdAt }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return fail(res, error, "Subjects couldn't load");
  }
};

const validCategory = (body) => {
  const name = str(body.name, 60);
  const description = str(body.description, 300);
  if (name.length < 2) return { error: 'Give the subject a name of at least 2 characters.' };
  if (description.length < 10) return { error: 'Add a short description (at least 10 characters).' };
  return { name, description };
};

exports.createCategory = async (req, res) => {
  const v = validCategory(req.body || {});
  if (v.error) return res.status(400).json({ success: false, message: v.error });
  try {
    const clash = await Category.findOne({ name: new RegExp(`^${escapeRegex(v.name)}$`, 'i') }).select('_id');
    if (clash) return res.status(409).json({ success: false, message: `A subject called "${v.name}" already exists.` });
    const cat = await Category.create({ name: v.name, description: v.description });
    adminLog(req, 'subject.create', `Added subject "${v.name}"`, { kind: 'category', id: String(cat._id) });
    return res.status(201).json({ success: true, message: 'Subject added', data: { _id: cat._id, name: cat.name, description: cat.description, courseCount: 0 } });
  } catch (error) {
    return fail(res, error, "The subject couldn't be added");
  }
};

exports.updateCategory = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid subject.' });
  const v = validCategory(req.body || {});
  if (v.error) return res.status(400).json({ success: false, message: v.error });
  try {
    const clash = await Category.findOne({ _id: { $ne: req.params.id }, name: new RegExp(`^${escapeRegex(v.name)}$`, 'i') }).select('_id');
    if (clash) return res.status(409).json({ success: false, message: `A subject called "${v.name}" already exists.` });
    const cat = await Category.findByIdAndUpdate(req.params.id, { name: v.name, description: v.description }, { new: true }).lean();
    if (!cat) return res.status(404).json({ success: false, message: 'That subject no longer exists.' });
    adminLog(req, 'subject.update', `Edited subject "${v.name}"`, { kind: 'category', id: String(cat._id) });
    return res.status(200).json({ success: true, message: 'Subject saved', data: { _id: cat._id, name: cat.name, description: cat.description, courseCount: (cat.courses || []).length } });
  } catch (error) {
    return fail(res, error, "The subject couldn't be saved");
  }
};

exports.deleteCategory = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid subject.' });
  try {
    const inUse = await Course.countDocuments({ category: req.params.id });
    if (inUse > 0) {
      return res.status(409).json({ success: false, message: `This subject still has ${inUse} ${inUse === 1 ? 'course' : 'courses'}. Move ${inUse === 1 ? 'it' : 'them'} to another subject first.` });
    }
    const gone = await Category.findByIdAndDelete(req.params.id);
    if (!gone) return res.status(404).json({ success: false, message: 'That subject no longer exists.' });
    adminLog(req, 'subject.delete', `Deleted subject "${gone.name}"`, { kind: 'category', id: String(gone._id) });
    return res.status(200).json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    return fail(res, error, "The subject couldn't be deleted");
  }
};

// ---- Courses ----

exports.listCourses = async (req, res) => {
  try {
    const q = str(req.query.q, 80);
    const filter = {};
    if (['Published', 'Draft', 'Pending'].includes(req.query.status)) filter.status = req.query.status;
    if (q.length >= 2) filter.courseName = new RegExp(escapeRegex(q), 'i');
    const courses = await Course.find(filter)
      .select('courseName thumbnail price status reviewNote category instructor studentsEnrolled createdAt updatedAt')
      .populate('instructor', 'firstName lastName email')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    const data = courses.map(({ studentsEnrolled, ...c }) => ({ ...c, studentsCount: (studentsEnrolled || []).length }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return fail(res, error, "Courses couldn't load");
  }
};

exports.setCourseStatus = async (req, res) => {
  const status = req.body?.status;
  const note = str(req.body?.note, 500);
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid course.' });
  if (!['Published', 'Draft'].includes(status)) return res.status(400).json({ success: false, message: 'Status must be Published or Draft.' });
  try {
    const before = await Course.findById(req.params.id).select('status courseName instructor').lean();
    if (!before) return res.status(404).json({ success: false, message: 'That course no longer exists.' });
    const rejecting = before.status === 'Pending' && status === 'Draft';
    if (rejecting && note.length < 5) return res.status(400).json({ success: false, message: 'Tell the instructor what to change (at least 5 characters).' });
    const update = status === 'Published' ? { status, $unset: { reviewNote: 1 } } : { status, ...(rejecting ? { reviewNote: note } : {}) };
    const course = await Course.findByIdAndUpdate(req.params.id, update, { new: true }).select('status courseName reviewNote').lean();

    const approved = before.status === 'Pending' && status === 'Published';
    const verb = approved ? 'Approved' : rejecting ? 'Sent back' : status === 'Published' ? 'Published' : 'Unpublished';
    adminLog(req, approved ? 'course.approve' : rejecting ? 'course.reject' : status === 'Published' ? 'course.publish' : 'course.unpublish', `${verb} "${course.courseName}"${rejecting ? `: ${note}` : ''}`, { kind: 'course', id: String(course._id) });

    if (approved || rejecting) {
      const teacher = await User.findById(before.instructor).select('email firstName').lean();
      if (teacher?.email) {
        mailSender.inBackground(teacher.email, approved ? `${course.courseName} is live` : `Changes needed: ${course.courseName}`, courseReviewEmail(teacher.firstName, course.courseName, approved, note));
      }
    }
    const message = approved
      ? `${course.courseName} is approved and live`
      : rejecting
        ? `${course.courseName} sent back to the instructor`
        : status === 'Published'
          ? `${course.courseName} is published`
          : `${course.courseName} is unpublished. Enrolled students keep access.`;
    return res.status(200).json({ success: true, message, data: course });
  } catch (error) {
    return fail(res, error, "The course couldn't be updated");
  }
};

// ---- Users ----

exports.listUsers = async (req, res) => {
  try {
    const q = str(req.query.q, 80);
    const filter = {};
    if (['Student', 'Instructor', 'Admin'].includes(req.query.role)) filter.accountType = req.query.role;
    if (q.length >= 2) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const PER = 25;
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('firstName lastName email accountType image courses suspended createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * PER)
        .limit(PER)
        .lean(),
    ]);
    const data = users.map(({ courses, ...u }) => ({ ...u, courseCount: (courses || []).length }));
    return res.status(200).json({ success: true, data, page, pages: Math.max(1, Math.ceil(total / PER)), total });
  } catch (error) {
    return fail(res, error, "Users couldn't load");
  }
};

exports.getUser = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user.' });
  try {
    const user = await User.findById(req.params.id)
      .select('firstName lastName email accountType image courses suspended suspendedReason createdAt')
      .populate('courses', 'courseName thumbnail price status')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'That user no longer exists.' });
    const [purchases, taught] = await Promise.all([
      Purchase.find({ user: user._id }).sort({ createdAt: -1 }).select('courses amount orderId paymentId createdAt').lean(),
      user.accountType === 'Instructor'
        ? Course.find({ instructor: user._id }).select('courseName status price studentsEnrolled').lean()
        : [],
    ]);
    return res.status(200).json({
      success: true,
      data: {
        ...user,
        purchases,
        taughtCourses: taught.map(({ studentsEnrolled, ...c }) => ({ ...c, studentsCount: (studentsEnrolled || []).length })),
      },
    });
  } catch (error) {
    return fail(res, error, "That user couldn't load");
  }
};

// ---- Purchases ----

exports.listPurchases = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const PER = 25;
    const [total, purchases] = await Promise.all([
      Purchase.countDocuments(),
      Purchase.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * PER)
        .limit(PER)
        .populate('user', 'firstName lastName email')
        .select('courses amount currency orderId paymentId coupon refund createdAt user')
        .lean(),
    ]);
    return res.status(200).json({ success: true, data: purchases, page, pages: Math.max(1, Math.ceil(total / PER)), total });
  } catch (error) {
    return fail(res, error, "Purchases couldn't load");
  }
};


// ---- Suspend accounts ----

// PATCH /admin/users/:id/suspension { suspended, reason }
exports.setSuspension = async (req, res) => {
  const suspended = req.body?.suspended === true;
  const reason = str(req.body?.reason, 300);
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user.' });
  if (String(req.params.id) === String(req.user.userId)) return res.status(400).json({ success: false, message: "You can't suspend your own account." });
  if (suspended && reason.length < 5) return res.status(400).json({ success: false, message: 'Give a reason (at least 5 characters). The user sees it.' });
  try {
    const target = await User.findById(req.params.id).select('accountType firstName lastName email').lean();
    if (!target) return res.status(404).json({ success: false, message: 'That user no longer exists.' });
    if (target.accountType === 'Admin') return res.status(400).json({ success: false, message: "Admin accounts can't be suspended here." });
    await User.updateOne({ _id: target._id }, suspended ? { suspended: true, suspendedReason: reason } : { suspended: false, $unset: { suspendedReason: 1 } });
    forgetSuspension(target._id);
    const name = [target.firstName, target.lastName].filter(Boolean).join(' ');
    adminLog(req, suspended ? 'user.suspend' : 'user.reactivate', `${suspended ? 'Suspended' : 'Reactivated'} ${name} (${target.email})${suspended ? `: ${reason}` : ''}`, { kind: 'user', id: String(target._id) });
    mailSender.inBackground(target.email, suspended ? 'Your StudyNotion account is suspended' : 'Your StudyNotion account is active again', suspensionEmail(target.firstName, suspended, reason));
    return res.status(200).json({ success: true, message: suspended ? `${name} is suspended and logged out` : `${name} can log in again` });
  } catch (error) {
    return fail(res, error, "The account couldn't be updated");
  }
};

// ---- Reviews ----

// GET /admin/reviews?show=all|hidden&page=
exports.listReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const PER = 25;
    const filter = req.query.show === 'hidden' ? { hidden: true } : {};
    const [total, reviews] = await Promise.all([
      RatingAndReview.countDocuments(filter),
      RatingAndReview.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PER)
        .limit(PER)
        .populate('user', 'firstName lastName email')
        .populate('course', 'courseName')
        .select('rating review hidden reply createdAt user course')
        .lean(),
    ]);
    return res.status(200).json({ success: true, data: reviews, page, pages: Math.max(1, Math.ceil(total / PER)), total });
  } catch (error) {
    return fail(res, error, "Reviews couldn't load");
  }
};

// PATCH /admin/reviews/:id { hidden }
exports.setReviewHidden = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid review.' });
  const hidden = req.body?.hidden === true;
  try {
    const r = await RatingAndReview.findByIdAndUpdate(req.params.id, { hidden }, { new: true }).populate('user', 'firstName lastName').populate('course', 'courseName').lean();
    if (!r) return res.status(404).json({ success: false, message: 'That review no longer exists.' });
    const who = [r.user?.firstName, r.user?.lastName].filter(Boolean).join(' ') || 'a user';
    adminLog(req, hidden ? 'review.hide' : 'review.show', `${hidden ? 'Hid' : 'Restored'} ${who}'s review of "${r.course?.courseName || 'a course'}"`, { kind: 'review', id: String(r._id) });
    return res.status(200).json({ success: true, message: hidden ? 'Review hidden. It no longer counts towards the rating.' : 'Review is visible again' });
  } catch (error) {
    return fail(res, error, "The review couldn't be updated");
  }
};

// ---- Refunds ----

// POST /admin/purchases/:orderId/refund { reason }
exports.refundPurchase = async (req, res) => {
  const reason = str(req.body?.reason, 300);
  if (reason.length < 5) return res.status(400).json({ success: false, message: 'Give a reason for the refund (at least 5 characters).' });
  try {
    const purchase = await Purchase.findOne({ orderId: String(req.params.orderId) }).populate('user', 'firstName lastName email').lean();
    if (!purchase) return res.status(404).json({ success: false, message: 'That order no longer exists.' });
    if (purchase.refund?.id) return res.status(409).json({ success: false, message: 'This order is already refunded.' });

    let refund;
    try {
      refund = await instance.payments.refund(purchase.paymentId, { amount: Math.round(purchase.amount * 100), notes: { reason, orderId: purchase.orderId } });
    } catch (error) {
      console.error('Razorpay refund:', error?.error?.description || error.message);
      return res.status(502).json({ success: false, message: `Razorpay refused the refund: ${error?.error?.description || 'unknown reason'}.` });
    }

    // Take back access to the refunded courses
    const userId = purchase.user?._id;
    const courseIds = purchase.courses.map((c) => c.course).filter(Boolean);
    if (userId && courseIds.length) {
      const progress = await CourseProgress.find({ userId, courseID: { $in: courseIds } }).select('_id').lean();
      await Promise.all([
        Course.updateMany({ _id: { $in: courseIds } }, { $pull: { studentsEnrolled: userId } }),
        User.updateOne({ _id: userId }, { $pull: { courses: { $in: courseIds }, courseProgress: { $in: progress.map((p) => p._id) } } }),
        CourseProgress.deleteMany({ _id: { $in: progress.map((p) => p._id) } }),
      ]);
    }
    await Purchase.updateOne({ _id: purchase._id }, { refund: { id: refund.id, amount: purchase.amount, at: new Date(), by: req.user.userId, reason } });

    const name = [purchase.user?.firstName, purchase.user?.lastName].filter(Boolean).join(' ') || 'a deleted account';
    const names = purchase.courses.map((c) => c.courseName).join(', ');
    adminLog(req, 'purchase.refund', `Refunded ₹${purchase.amount} to ${name} for ${names}: ${reason}`, { kind: 'purchase', id: purchase.orderId });
    if (purchase.user?.email) mailSender.inBackground(purchase.user.email, 'Your StudyNotion refund', refundEmail(purchase.user.firstName, names, purchase.amount));
    return res.status(200).json({ success: true, message: `Refunded ₹${purchase.amount.toLocaleString('en-IN')}. Access to ${names} is removed.` });
  } catch (error) {
    return fail(res, error, "The refund couldn't be completed");
  }
};

// ---- Activity log ----

exports.listLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const PER = 30;
    const [total, logs] = await Promise.all([
      AdminLog.countDocuments(),
      AdminLog.find().sort({ createdAt: -1 }).skip((page - 1) * PER).limit(PER).populate('admin', 'firstName lastName').select('action summary target createdAt admin').lean(),
    ]);
    return res.status(200).json({ success: true, data: logs, page, pages: Math.max(1, Math.ceil(total / PER)), total });
  } catch (error) {
    return fail(res, error, "The activity log couldn't load");
  }
};

// ---- CSV export ----

// Cells starting with = + - @ are prefixed so spreadsheets don't run them as formulas
const csvCell = (v) => {
  let t = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const toCsv = (header, rows) => [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
exports._toCsv = toCsv;

// GET /admin/export/users | /admin/export/purchases
exports.exportCsv = async (req, res) => {
  const kind = req.params.kind;
  try {
    let csv;
    if (kind === 'users') {
      const users = await User.find().select('firstName lastName email accountType courses suspended createdAt').sort({ createdAt: -1 }).limit(50000).lean();
      csv = toCsv(['First name', 'Last name', 'Email', 'Role', 'Courses', 'Suspended', 'Joined'], users.map((u) => [u.firstName, u.lastName, u.email, u.accountType, (u.courses || []).length, u.suspended ? 'Yes' : 'No', u.createdAt?.toISOString().slice(0, 10)]));
    } else if (kind === 'purchases') {
      const list = await Purchase.find().sort({ createdAt: -1 }).limit(50000).populate('user', 'firstName lastName email').lean();
      csv = toCsv(['Date', 'Buyer', 'Email', 'Courses', 'Amount (INR)', 'Discount code', 'Order ID', 'Payment ID', 'Refunded'], list.map((p) => [p.createdAt?.toISOString().slice(0, 10), [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' '), p.user?.email, p.courses.map((c) => c.courseName).join('; '), p.amount, p.coupon?.code || '', p.orderId, p.paymentId, p.refund ? `Yes (${p.refund.at?.toISOString().slice(0, 10)})` : 'No']));
    } else {
      return res.status(404).json({ success: false, message: 'Unknown export.' });
    }
    adminLog(req, 'export', `Downloaded ${kind} as CSV`, { kind: 'export', id: kind });
    const stamp = new Date().toISOString().slice(0, 10);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="studynotion-${kind}-${stamp}.csv"`, 'Cache-Control': 'no-store' });
    return res.status(200).send('\uFEFF' + csv); // BOM so Excel reads ₹ and names correctly
  } catch (error) {
    return fail(res, error, "The export couldn't be created");
  }
};
