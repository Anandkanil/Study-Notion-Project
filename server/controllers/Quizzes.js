/*
 * Section quizzes. The instructor writes one multiple-choice quiz per section;
 * enrolled students take it as often as they like (up to a daily limit) and see their best score.
 * Answers are only ever checked on the server, so the right options never reach the browser
 * before an attempt.
 */
const mongoose = require('mongoose');
const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');

const isId = (id) => /^[a-f0-9]{24}$/i.test(String(id || ''));
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const MAX_QUESTIONS = 30;
const DAILY_ATTEMPTS = 20;

/** Checks and tidies a quiz body from the instructor. */
function validateQuiz(body = {}) {
  const raw = Array.isArray(body.questions) ? body.questions : [];
  if (raw.length < 1) return { error: 'Add at least one question.' };
  if (raw.length > MAX_QUESTIONS) return { error: `A quiz can have up to ${MAX_QUESTIONS} questions.` };
  const questions = [];
  for (let i = 0; i < raw.length; i++) {
    const q = raw[i] || {};
    const n = i + 1;
    const text = str(q.text, 300);
    const options = (Array.isArray(q.options) ? q.options : []).map((o) => str(o, 200)).filter(Boolean);
    const answer = Number(q.answer);
    if (text.length < 3) return { error: `Question ${n}: write the question (at least 3 characters).` };
    if (options.length < 2 || options.length > 6) return { error: `Question ${n}: give 2 to 6 answer options.` };
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return { error: `Question ${n}: two options are the same.` };
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) return { error: `Question ${n}: mark which option is correct.` };
    questions.push({ text, options, answer, explain: str(q.explain, 500) });
  }
  const pass = Number(body.passPercent ?? 60);
  if (!Number.isInteger(pass) || pass < 40 || pass > 100) return { error: 'Set a pass mark between 40% and 100%.' };
  return { value: { questions, passPercent: pass } };
}
exports._validateQuiz = validateQuiz;

/** The course if the caller teaches it, with its sections. */
async function ownCourse(req, res) {
  if (!isId(req.params.courseId)) {
    res.status(400).json({ success: false, message: 'Invalid course.' });
    return null;
  }
  const course = await Course.findOne({ _id: req.params.courseId, instructor: req.user.userId })
    .select('courseName courseContent')
    .populate({ path: 'courseContent', select: 'sectionName subSection' })
    .lean();
  if (!course) res.status(404).json({ success: false, message: "That course isn't one of yours." });
  return course;
}

/** The course if the caller is enrolled in it or teaches it. */
async function learnerCourse(req, res, courseId) {
  if (!isId(courseId)) {
    res.status(400).json({ success: false, message: 'Invalid course.' });
    return null;
  }
  const course = await Course.findById(courseId)
    .select('courseName instructor studentsEnrolled courseContent')
    .populate({ path: 'courseContent', select: 'sectionName subSection' })
    .lean();
  if (!course) {
    res.status(404).json({ success: false, message: 'Course not found.' });
    return null;
  }
  const me = String(req.user.userId);
  const allowed = String(course.instructor) === me || (course.studentsEnrolled || []).some((id) => String(id) === me);
  if (!allowed) {
    res.status(403).json({ success: false, message: 'Quizzes are for students enrolled in this course.' });
    return null;
  }
  return course;
}

const hasSection = (course, sectionId) => (course.courseContent || []).some((s) => String(s._id) === String(sectionId));

// ---- Instructor ----

// GET /instructor/courses/:courseId/quizzes: every section and its quiz, with answers
exports.instructorList = async (req, res) => {
  try {
    const course = await ownCourse(req, res);
    if (!course) return;
    const quizzes = await Quiz.find({ course: course._id }).lean();
    const bySection = new Map(quizzes.map((q) => [String(q.section), q]));
    const attempts = quizzes.length
      ? await QuizAttempt.aggregate([
          { $match: { quiz: { $in: quizzes.map((q) => q._id) } } },
          { $group: { _id: '$quiz', attempts: { $sum: 1 }, passed: { $sum: { $cond: ['$passed', 1, 0] } }, students: { $addToSet: '$user' } } },
        ])
      : [];
    const statsByQuiz = new Map(attempts.map((a) => [String(a._id), { attempts: a.attempts, passed: a.passed, students: a.students.length }]));
    const data = (course.courseContent || []).map((s) => {
      const q = bySection.get(String(s._id));
      return {
        sectionId: s._id,
        sectionName: s.sectionName,
        quiz: q ? { _id: q._id, questions: q.questions, passPercent: q.passPercent, updatedAt: q.updatedAt, stats: statsByQuiz.get(String(q._id)) || { attempts: 0, passed: 0, students: 0 } } : null,
      };
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('quizzes.instructorList:', error.message);
    return res.status(500).json({ success: false, message: "Quizzes couldn't load." });
  }
};

// PUT /instructor/courses/:courseId/sections/:sectionId/quiz
exports.upsert = async (req, res) => {
  const v = validateQuiz(req.body);
  if (v.error) return res.status(400).json({ success: false, message: v.error });
  try {
    const course = await ownCourse(req, res);
    if (!course) return;
    if (!isId(req.params.sectionId) || !hasSection(course, req.params.sectionId)) {
      return res.status(400).json({ success: false, message: "That section isn't part of this course." });
    }
    const quiz = await Quiz.findOneAndUpdate(
      { section: req.params.sectionId },
      { course: course._id, section: req.params.sectionId, ...v.value },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    const n = v.value.questions.length;
    return res.status(200).json({ success: true, message: `Quiz saved with ${n} ${n === 1 ? 'question' : 'questions'}`, data: quiz });
  } catch (error) {
    console.error('quizzes.upsert:', error.message);
    return res.status(500).json({ success: false, message: "The quiz couldn't be saved." });
  }
};

// DELETE /instructor/courses/:courseId/sections/:sectionId/quiz
exports.remove = async (req, res) => {
  try {
    const course = await ownCourse(req, res);
    if (!course) return;
    const quiz = await Quiz.findOneAndDelete({ course: course._id, section: req.params.sectionId }).lean();
    if (!quiz) return res.status(404).json({ success: false, message: 'That section has no quiz.' });
    await QuizAttempt.deleteMany({ quiz: quiz._id });
    return res.status(200).json({ success: true, message: 'Quiz deleted' });
  } catch (error) {
    console.error('quizzes.remove:', error.message);
    return res.status(500).json({ success: false, message: "The quiz couldn't be deleted." });
  }
};

// ---- Students ----

// GET /learn/:courseId/quizzes: which sections have a quiz, and my best score on each
exports.listForCourse = async (req, res) => {
  try {
    const course = await learnerCourse(req, res, req.params.courseId);
    if (!course) return;
    const quizzes = await Quiz.find({ course: course._id }).select('section questions passPercent').lean();
    const best = quizzes.length
      ? await QuizAttempt.aggregate([
          { $match: { user: new mongoose.Types.ObjectId(String(req.user.userId)), quiz: { $in: quizzes.map((q) => q._id) } } },
          { $sort: { score: -1, createdAt: 1 } },
          { $group: { _id: '$quiz', score: { $first: '$score' }, total: { $first: '$total' }, passed: { $max: '$passed' }, attempts: { $sum: 1 } } },
        ])
      : [];
    const bestBy = new Map(best.map((b) => [String(b._id), b]));
    const names = new Map((course.courseContent || []).map((s) => [String(s._id), s.sectionName]));
    const data = quizzes
      .filter((q) => names.has(String(q.section)))
      .map((q) => {
        const b = bestBy.get(String(q._id));
        return {
          quizId: q._id,
          sectionId: q.section,
          sectionName: names.get(String(q.section)),
          questionCount: q.questions.length,
          passPercent: q.passPercent,
          best: b ? { score: b.score, total: b.total, passed: b.passed, attempts: b.attempts } : null,
        };
      });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('quizzes.listForCourse:', error.message);
    return res.status(500).json({ success: false, message: "Quizzes couldn't load." });
  }
};

// GET /learn/:courseId/quizzes/:sectionId: the questions, without the answers
exports.getForSection = async (req, res) => {
  try {
    const course = await learnerCourse(req, res, req.params.courseId);
    if (!course) return;
    const quiz = isId(req.params.sectionId) ? await Quiz.findOne({ course: course._id, section: req.params.sectionId }).lean() : null;
    if (!quiz) return res.status(404).json({ success: false, message: 'This section has no quiz.' });
    return res.status(200).json({
      success: true,
      data: { quizId: quiz._id, passPercent: quiz.passPercent, questions: quiz.questions.map((q) => ({ text: q.text, options: q.options })) },
    });
  } catch (error) {
    console.error('quizzes.getForSection:', error.message);
    return res.status(500).json({ success: false, message: "The quiz couldn't load." });
  }
};

// POST /learn/quizzes/:quizId/attempts { answers: [optionIndex | null] }
exports.attempt = async (req, res) => {
  if (!isId(req.params.quizId)) return res.status(400).json({ success: false, message: 'Invalid quiz.' });
  try {
    const quiz = await Quiz.findById(req.params.quizId).lean();
    if (!quiz) return res.status(404).json({ success: false, message: 'This quiz no longer exists.' });
    const course = await learnerCourse(req, res, quiz.course);
    if (!course) return;
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    if (answers.length !== quiz.questions.length) {
      return res.status(400).json({ success: false, message: 'Answer every question before submitting.' });
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = await QuizAttempt.countDocuments({ user: req.user.userId, quiz: quiz._id, createdAt: { $gte: since } });
    if (today >= DAILY_ATTEMPTS) {
      return res.status(429).json({ success: false, message: `You've tried this quiz ${DAILY_ATTEMPTS} times today. Rewatch the section and try again tomorrow.` });
    }
    const picked = answers.map((a) => (Number.isInteger(a) ? a : -1));
    const results = quiz.questions.map((q, i) => ({ correct: picked[i] === q.answer, answer: q.answer, explain: q.explain }));
    const score = results.filter((r) => r.correct).length;
    const total = quiz.questions.length;
    const passed = Math.round((score / total) * 100) >= quiz.passPercent;
    await QuizAttempt.create({ user: req.user.userId, quiz: quiz._id, course: quiz.course, score, total, passed, answers: picked });
    return res.status(200).json({
      success: true,
      message: passed ? `Passed: ${score} of ${total}` : `${score} of ${total}. You need ${quiz.passPercent}% to pass.`,
      data: { score, total, passed, passPercent: quiz.passPercent, results },
    });
  } catch (error) {
    console.error('quizzes.attempt:', error.message);
    return res.status(500).json({ success: false, message: "Your answers couldn't be checked. Please try again." });
  }
};
