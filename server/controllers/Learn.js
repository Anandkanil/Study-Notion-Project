/*
 * Lesson notes (private to each student) and lesson Q&A (shared with the course).
 * Only enrolled students and the course's instructor can use them, and every
 * lesson id must belong to the course.
 */
const mongoose = require('mongoose');
const notify = require('../utils/notify');
const Section = require('../models/Section');
const Course = require('../models/Course');
const Note = require('../models/Note');
const Question = require('../models/Question');
const User = require('../models/User');
const mailSender = require('../utils/mailSender');
const { answerEmail } = require('../mail/templates/answerEmail');

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const fail = (res, error, message) => {
  console.error(`Learn: ${message}:`, error?.message || error);
  return res.status(500).json({ success: false, message: `${message}. Please try again.` });
};

/**
 * Loads the course and checks the caller may use it. Returns { course, lessonIds, isInstructor }
 * or sends an error and returns null.
 */
async function access(req, res, courseId) {
  if (!isId(courseId)) {
    res.status(400).json({ success: false, message: 'Invalid course.' });
    return null;
  }
  const course = await Course.findById(courseId)
    .select('courseName instructor studentsEnrolled courseContent')
    .populate({ path: 'courseContent', select: 'subSection' })
    .lean();
  if (!course) {
    res.status(404).json({ success: false, message: 'Course not found.' });
    return null;
  }
  const me = String(req.user.userId);
  const isInstructor = String(course.instructor) === me;
  const enrolled = (course.studentsEnrolled || []).some((id) => String(id) === me);
  if (!isInstructor && !enrolled) {
    res.status(403).json({ success: false, message: 'Notes and questions are for students enrolled in this course.' });
    return null;
  }
  const lessonIds = new Set((course.courseContent || []).flatMap((s) => (s.subSection || []).map(String)));
  return { course, lessonIds, isInstructor };
}

const checkLesson = (res, ctx, lessonId) => {
  if (!isId(lessonId) || !ctx.lessonIds.has(String(lessonId))) {
    res.status(400).json({ success: false, message: "That lesson isn't part of this course." });
    return false;
  }
  return true;
};

// ---------- Notes ----------

// GET /learn/:courseId/notes?lesson=<id>   (no lesson: all my notes in the course)
exports.listNotes = async (req, res) => {
  try {
    const ctx = await access(req, res, req.params.courseId);
    if (!ctx) return;
    const filter = { user: req.user.userId, course: req.params.courseId };
    if (req.query.lesson) {
      if (!checkLesson(res, ctx, req.query.lesson)) return;
      filter.lesson = req.query.lesson;
    }
    const notes = await Note.find(filter).sort({ lesson: 1, at: 1 }).select('lesson at text createdAt').lean();
    return res.status(200).json({ success: true, data: notes });
  } catch (error) {
    return fail(res, error, "Your notes couldn't load");
  }
};

// POST /learn/:courseId/notes { lessonId, at, text }
exports.createNote = async (req, res) => {
  const text = str(req.body?.text, 1000);
  const at = Math.max(0, Math.floor(Number(req.body?.at) || 0));
  if (!text) return res.status(400).json({ success: false, message: 'Write something first.' });
  try {
    const ctx = await access(req, res, req.params.courseId);
    if (!ctx || !checkLesson(res, ctx, req.body?.lessonId)) return;
    const count = await Note.countDocuments({ user: req.user.userId, lesson: req.body.lessonId });
    if (count >= 200) return res.status(400).json({ success: false, message: 'This lesson already has 200 notes. Delete some to add more.' });
    const note = await Note.create({ user: req.user.userId, course: req.params.courseId, lesson: req.body.lessonId, at, text });
    return res.status(201).json({ success: true, message: 'Note saved', data: { _id: note._id, lesson: note.lesson, at: note.at, text: note.text, createdAt: note.createdAt } });
  } catch (error) {
    return fail(res, error, "Your note couldn't be saved");
  }
};

// PUT /learn/notes/:id { text }
exports.updateNote = async (req, res) => {
  const text = str(req.body?.text, 1000);
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid note.' });
  if (!text) return res.status(400).json({ success: false, message: 'A note needs some text.' });
  try {
    const note = await Note.findOneAndUpdate({ _id: req.params.id, user: req.user.userId }, { text }, { new: true }).select('lesson at text createdAt').lean();
    if (!note) return res.status(404).json({ success: false, message: 'That note no longer exists.' });
    return res.status(200).json({ success: true, message: 'Note saved', data: note });
  } catch (error) {
    return fail(res, error, "Your note couldn't be saved");
  }
};

// DELETE /learn/notes/:id
exports.deleteNote = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid note.' });
  try {
    const gone = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
    if (!gone) return res.status(404).json({ success: false, message: 'That note no longer exists.' });
    return res.status(200).json({ success: true, message: 'Note deleted' });
  } catch (error) {
    return fail(res, error, "Your note couldn't be deleted");
  }
};

// ---------- Q&A ----------

const shapeQuestion = (q, me) => ({
  _id: q._id,
  lesson: q.lesson,
  text: q.text,
  createdAt: q.createdAt,
  resolved: q.resolved,
  answeredByInstructor: q.answeredByInstructor,
  user: q.user ? { _id: q.user._id, firstName: q.user.firstName, lastName: q.user.lastName, image: q.user.image } : null,
  mine: q.user && String(q.user._id) === String(me),
  answers: (q.answers || []).map((a) => ({
    _id: a._id,
    text: a.text,
    createdAt: a.createdAt,
    byInstructor: a.byInstructor,
    user: a.user ? { _id: a.user._id, firstName: a.user.firstName, lastName: a.user.lastName, image: a.user.image } : null,
  })),
});
const PEOPLE = 'firstName lastName image';

// GET /learn/:courseId/questions?lesson=<id>
exports.listQuestions = async (req, res) => {
  try {
    const ctx = await access(req, res, req.params.courseId);
    if (!ctx) return;
    const filter = { course: req.params.courseId };
    if (req.query.lesson) {
      if (!checkLesson(res, ctx, req.query.lesson)) return;
      filter.lesson = req.query.lesson;
    }
    const list = await Question.find(filter).sort({ createdAt: -1 }).limit(100).populate('user', PEOPLE).populate('answers.user', PEOPLE).lean();
    return res.status(200).json({ success: true, data: list.map((q) => shapeQuestion(q, req.user.userId)) });
  } catch (error) {
    return fail(res, error, "Questions couldn't load");
  }
};

// POST /learn/:courseId/questions { lessonId, text }
exports.askQuestion = async (req, res) => {
  const text = str(req.body?.text, 2000);
  if (text.length < 10) return res.status(400).json({ success: false, message: 'Write your question in at least 10 characters.' });
  try {
    const ctx = await access(req, res, req.params.courseId);
    if (!ctx || !checkLesson(res, ctx, req.body?.lessonId)) return;
    // Light flood control: 10 questions per student per course per day
    const since = new Date(Date.now() - 24 * 3600e3);
    if ((await Question.countDocuments({ user: req.user.userId, course: req.params.courseId, createdAt: { $gte: since } })) >= 10) {
      return res.status(429).json({ success: false, message: "You've asked 10 questions today in this course. Try again tomorrow." });
    }
    const q = await Question.create({ course: req.params.courseId, lesson: req.body.lessonId, user: req.user.userId, text });
    const full = await Question.findById(q._id).populate('user', PEOPLE).lean();
    return res.status(201).json({ success: true, message: 'Question posted', data: shapeQuestion(full, req.user.userId) });
  } catch (error) {
    return fail(res, error, "Your question couldn't be posted");
  }
};

// POST /learn/questions/:id/answers { text }
exports.answerQuestion = async (req, res) => {
  const text = str(req.body?.text, 2000);
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid question.' });
  if (text.length < 2) return res.status(400).json({ success: false, message: 'Write an answer first.' });
  try {
    const question = await Question.findById(req.params.id).select('course user answers lesson');
    if (!question) return res.status(404).json({ success: false, message: 'That question no longer exists.' });
    const ctx = await access(req, res, question.course);
    if (!ctx) return;
    if ((question.answers || []).length >= 100) return res.status(400).json({ success: false, message: 'This question has reached 100 answers.' });
    question.answers.push({ user: req.user.userId, text, byInstructor: ctx.isInstructor });
    if (ctx.isInstructor) question.answeredByInstructor = true;
    await question.save();

    // Let the asker know when the instructor answers (not for their own answers)
    if (ctx.isInstructor && String(question.user) !== String(req.user.userId)) {
      User.findById(question.user).select('email firstName').lean()
        .then((asker) => asker?.email && mailSender.inBackground(asker.email, `Your question in ${ctx.course.courseName} was answered`, answerEmail(asker.firstName, ctx.course.courseName, text, String(ctx.course._id))))
        .catch((e) => console.error('Answer notice:', e.message));
      Promise.resolve()
        .then(() => Section.findOne({ subSection: question.lesson }).select('_id').lean())
        .then((sec) => notify(question.user, {
          type: 'answer',
          title: `The instructor answered your question in ${ctx.course.courseName}`,
          body: text,
          link: sec ? `/view-course/${ctx.course._id}/section/${sec._id}/sub-section/${question.lesson}` : `/courses/${ctx.course._id}`,
        }))
        .catch((e) => console.error('Answer notify:', e.message));
    }

    const full = await Question.findById(question._id).populate('user', PEOPLE).populate('answers.user', PEOPLE).lean();
    return res.status(201).json({ success: true, message: 'Answer posted', data: shapeQuestion(full, req.user.userId) });
  } catch (error) {
    return fail(res, error, "Your answer couldn't be posted");
  }
};

// PATCH /learn/questions/:id { resolved }  — asker or instructor
exports.setResolved = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid question.' });
  try {
    const question = await Question.findById(req.params.id).select('course user');
    if (!question) return res.status(404).json({ success: false, message: 'That question no longer exists.' });
    const ctx = await access(req, res, question.course);
    if (!ctx) return;
    if (!ctx.isInstructor && String(question.user) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: 'Only the person who asked, or the instructor, can do that.' });
    }
    question.resolved = req.body?.resolved === true;
    await question.save();
    return res.status(200).json({ success: true, message: question.resolved ? 'Marked as answered' : 'Marked as open' });
  } catch (error) {
    return fail(res, error, "The question couldn't be updated");
  }
};

// DELETE /learn/questions/:id — asker or instructor
exports.deleteQuestion = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid question.' });
  try {
    const question = await Question.findById(req.params.id).select('course user');
    if (!question) return res.status(404).json({ success: false, message: 'That question no longer exists.' });
    const ctx = await access(req, res, question.course);
    if (!ctx) return;
    if (!ctx.isInstructor && String(question.user) !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: 'Only the person who asked, or the instructor, can delete it.' });
    }
    await Question.deleteOne({ _id: question._id });
    return res.status(200).json({ success: true, message: 'Question deleted' });
  } catch (error) {
    return fail(res, error, "The question couldn't be deleted");
  }
};

// GET /instructor/courses/:courseId/questions?open=1 — every question in an instructor's course
exports.listCourseQuestionsForInstructor = async (req, res) => {
  try {
    if (!isId(req.params.courseId)) return res.status(400).json({ success: false, message: 'Invalid course.' });
    const course = await Course.findOne({ _id: req.params.courseId, instructor: req.user.userId })
      .select('courseContent')
      .populate({ path: 'courseContent', select: 'sectionName subSection', populate: { path: 'subSection', select: 'title' } })
      .lean();
    if (!course) return res.status(404).json({ success: false, message: "That course isn't one of yours." });
    const titles = new Map((course.courseContent || []).flatMap((s) => (s.subSection || []).map((l) => [String(l._id), { title: l.title, section: s.sectionName, sectionId: String(s._id) }])));
    const filter = { course: course._id };
    if (req.query.open === '1') Object.assign(filter, { answeredByInstructor: false, resolved: false });
    const list = await Question.find(filter).sort({ createdAt: -1 }).limit(200).populate('user', PEOPLE).populate('answers.user', PEOPLE).lean();
    return res.status(200).json({
      success: true,
      data: list.map((q) => ({ ...shapeQuestion(q, req.user.userId), lessonInfo: titles.get(String(q.lesson)) || null })),
    });
  } catch (error) {
    return fail(res, error, "Questions couldn't load");
  }
};
