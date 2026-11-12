/*
 * Admin-only endpoints for the admin panel. Every route is behind auth + isAdmin.
 * Responses carry only what the screens show: no passwords, tokens or video URLs.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Category = require('../models/Category');
const Purchase = require('../models/Purchase');

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

    const [students, instructors, published, drafts, totals, byMonth, signupsByMonth, topCourses, recent] = await Promise.all([
      User.countDocuments({ accountType: 'Student' }),
      User.countDocuments({ accountType: 'Instructor' }),
      Course.countDocuments({ status: 'Published' }),
      Course.countDocuments({ status: { $ne: 'Published' } }),
      Purchase.aggregate([{ $group: { _id: null, revenue: { $sum: '$amount' }, orders: { $sum: 1 } } }]),
      Purchase.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, revenue: { $sum: '$amount' }, orders: { $sum: 1 } } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: since }, accountType: 'Student' } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      Purchase.aggregate([
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
    if (['Published', 'Draft'].includes(req.query.status)) filter.status = req.query.status;
    if (q.length >= 2) filter.courseName = new RegExp(escapeRegex(q), 'i');
    const courses = await Course.find(filter)
      .select('courseName thumbnail price status category instructor studentsEnrolled createdAt')
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
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid course.' });
  if (!['Published', 'Draft'].includes(status)) return res.status(400).json({ success: false, message: 'Status must be Published or Draft.' });
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('status courseName').lean();
    if (!course) return res.status(404).json({ success: false, message: 'That course no longer exists.' });
    const message = status === 'Published' ? `${course.courseName} is published` : `${course.courseName} is unpublished. Enrolled students keep access.`;
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
        .select('firstName lastName email accountType image courses createdAt')
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
      .select('firstName lastName email accountType image courses createdAt')
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
        .select('courses amount currency orderId paymentId createdAt user')
        .lean(),
    ]);
    return res.status(200).json({ success: true, data: purchases, page, pages: Math.max(1, Math.ceil(total / PER)), total });
  } catch (error) {
    return fail(res, error, "Purchases couldn't load");
  }
};
