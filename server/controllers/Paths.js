/*
 * Guided paths. Admins build them from published courses; everyone can browse published paths.
 * A path's progress is worked out in the browser from the student's own enrolled courses.
 */
const Path = require('../models/Path');
const Course = require('../models/Course');
const adminLog = require('../utils/adminLog');

const isId = (id) => /^[a-f0-9]{24}$/i.test(String(id || ''));
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const MAX_COURSES = 12;

const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 80) || 'path';

const COURSE_FIELDS = 'courseName courseDescription thumbnail price instructor category courseContent status';

/** Public shape of a path with its published courses in order. */
async function shape(path, { full = false } = {}) {
  const courses = await Course.find({ _id: { $in: path.courses }, status: 'Published' })
    .select(COURSE_FIELDS)
    .populate('instructor', 'firstName lastName')
    .populate('category', 'name')
    .populate({ path: 'courseContent', select: 'subSection' })
    .lean();
  const byId = new Map(courses.map((c) => [String(c._id), c]));
  const ordered = path.courses.map((id) => byId.get(String(id))).filter(Boolean);
  const list = ordered.map((c) => ({
    _id: c._id,
    courseName: c.courseName,
    thumbnail: c.thumbnail,
    price: c.price,
    instructor: c.instructor ? `${c.instructor.firstName} ${c.instructor.lastName}`.trim() : '',
    category: c.category?.name || '',
    lessons: (c.courseContent || []).reduce((n, s) => n + (s.subSection || []).length, 0),
    ...(full ? { courseDescription: c.courseDescription } : {}),
  }));
  return {
    _id: path._id,
    title: path.title,
    slug: path.slug,
    summary: path.summary,
    level: path.level,
    published: path.published,
    courses: list,
    totalPrice: list.reduce((n, c) => n + (Number(c.price) || 0), 0),
    totalLessons: list.reduce((n, c) => n + c.lessons, 0),
  };
}

// ---- Public ----

// GET /course/paths
exports.listPublic = async (req, res) => {
  try {
    const paths = await Path.find({ published: true }).sort({ createdAt: 1 }).lean();
    const data = (await Promise.all(paths.map((p) => shape(p)))).filter((p) => p.courses.length > 0);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('paths.listPublic:', error.message);
    return res.status(500).json({ success: false, message: "Paths couldn't load. Please try again." });
  }
};

// GET /course/paths/:slug
exports.getPublic = async (req, res) => {
  const slug = str(req.params.slug, 90).toLowerCase();
  try {
    const path = await Path.findOne({ slug, published: true }).lean();
    if (!path) return res.status(404).json({ success: false, message: "That path doesn't exist." });
    return res.status(200).json({ success: true, data: await shape(path, { full: true }) });
  } catch (error) {
    console.error('paths.getPublic:', error.message);
    return res.status(500).json({ success: false, message: "This path couldn't load. Please try again." });
  }
};

// ---- Admin ----

async function validate(body, id) {
  const title = str(body.title, 80);
  const summary = str(body.summary, 300);
  const level = LEVELS.includes(body.level) ? body.level : 'Beginner';
  const ids = Array.isArray(body.courses) ? [...new Set(body.courses.map(String))] : [];
  if (title.length < 3) return { error: 'Give the path a title of at least 3 characters.' };
  if (summary.length < 10) return { error: 'Add a short summary (at least 10 characters).' };
  if (!ids.every(isId)) return { error: 'One of the courses is invalid.' };
  if (ids.length > MAX_COURSES) return { error: `A path can have up to ${MAX_COURSES} courses.` };
  const published = Boolean(body.published);
  if (published && ids.length < 2) return { error: 'Add at least 2 courses before publishing a path.' };
  if (ids.length) {
    const found = await Course.countDocuments({ _id: { $in: ids }, status: 'Published' });
    if (found !== ids.length) return { error: 'Only published courses can be added to a path.' };
  }
  let slug = slugify(str(body.slug, 80) || title);
  const clash = await Path.findOne({ slug, ...(id ? { _id: { $ne: id } } : {}) }).select('_id').lean();
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  return { value: { title, summary, level, courses: ids, published, slug } };
}

// GET /admin/paths
exports.adminList = async (req, res) => {
  try {
    const paths = await Path.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: await Promise.all(paths.map(async (p) => ({ ...(await shape(p)), courseIds: p.courses.map(String) }))) });
  } catch (error) {
    console.error('paths.adminList:', error.message);
    return res.status(500).json({ success: false, message: "Paths couldn't load." });
  }
};

// GET /admin/paths/course-options: published courses to pick from
exports.courseOptions = async (req, res) => {
  try {
    const courses = await Course.find({ status: 'Published' }).select('courseName thumbnail').sort({ courseName: 1 }).lean();
    return res.status(200).json({ success: true, data: courses });
  } catch (error) {
    console.error('paths.courseOptions:', error.message);
    return res.status(500).json({ success: false, message: "Courses couldn't load." });
  }
};

// POST /admin/paths
exports.create = async (req, res) => {
  try {
    const v = await validate(req.body || {});
    if (v.error) return res.status(400).json({ success: false, message: v.error });
    const path = await Path.create(v.value);
    adminLog(req, 'path.create', `Created path "${path.title}"${path.published ? ' (published)' : ''}`, { kind: 'path', id: String(path._id) });
    return res.status(201).json({ success: true, message: path.published ? 'Path published' : 'Path saved as a draft', data: path });
  } catch (error) {
    console.error('paths.create:', error.message);
    return res.status(500).json({ success: false, message: "The path couldn't be saved." });
  }
};

// PUT /admin/paths/:id
exports.update = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid path.' });
  try {
    const v = await validate(req.body || {}, req.params.id);
    if (v.error) return res.status(400).json({ success: false, message: v.error });
    const path = await Path.findByIdAndUpdate(req.params.id, v.value, { new: true }).lean();
    if (!path) return res.status(404).json({ success: false, message: 'That path no longer exists.' });
    adminLog(req, 'path.update', `Updated path "${path.title}"${path.published ? ' (published)' : ' (draft)'}`, { kind: 'path', id: String(path._id) });
    return res.status(200).json({ success: true, message: 'Path saved', data: path });
  } catch (error) {
    console.error('paths.update:', error.message);
    return res.status(500).json({ success: false, message: "The path couldn't be saved." });
  }
};

// DELETE /admin/paths/:id
exports.remove = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid path.' });
  try {
    const path = await Path.findByIdAndDelete(req.params.id).lean();
    if (!path) return res.status(404).json({ success: false, message: 'That path no longer exists.' });
    adminLog(req, 'path.delete', `Deleted path "${path.title}"`, { kind: 'path', id: String(path._id) });
    return res.status(200).json({ success: true, message: 'Path deleted' });
  } catch (error) {
    console.error('paths.remove:', error.message);
    return res.status(500).json({ success: false, message: "The path couldn't be deleted." });
  }
};

exports._slugify = slugify;
