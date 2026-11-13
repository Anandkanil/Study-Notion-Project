// Section quizzes: instructor input is checked, answers never leak, grading happens on the server.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {};
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Types: { ObjectId: function (v) { return v; } } };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; }
  return realLoad.apply(this, arguments);
};
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const chain = (v) => { const p = Promise.resolve(v); ['select', 'populate', 'sort'].forEach((k) => (p[k] = () => p)); p.lean = () => p; return p; };
const C = 'cccccccccccccccccccccccc', S = 'ssssssssssssssssssssssss'.replace(/s/g, 'a'), Qz = 'bbbbbbbbbbbbbbbbbbbbbbbb', ME = 'dddddddddddddddddddddddd';
(async () => {
  const course = { _id: C, instructor: 'teacher', studentsEnrolled: [ME], courseContent: [{ _id: S, sectionName: 'Basics' }] };
  const quiz = { _id: Qz, course: C, section: S, passPercent: 60, questions: [
    { text: 'Two plus two?', options: ['3', '4'], answer: 1, explain: 'Basic sums.' },
    { text: 'Capital of India?', options: ['Delhi', 'Mumbai', 'Pune'], answer: 0, explain: '' },
  ] };
  let attempts = 0; let saved = null; let upserted = null;
  fakes['models/Course'] = { findById: () => chain(course), findOne: (q) => chain(q.instructor === 'teacher' ? course : null) };
  fakes['models/Quiz'] = { findOne: () => chain(quiz), findById: () => chain(quiz), find: () => chain([quiz]), findOneAndUpdate: (q, u) => chain((upserted = u)) };
  fakes['models/QuizAttempt'] = { countDocuments: async () => attempts, create: async (d) => (saved = d), aggregate: async () => [] };
  const Q = require(SRV + '/controllers/Quizzes');

  await test('a quiz needs a correct option marked', async () => {
    const v = Q._validateQuiz({ questions: [{ text: 'Pick one', options: ['a', 'b'], answer: 5 }] }); assert.match(v.error, /mark which option/);
  });
  await test('duplicate options are refused', async () => {
    const v = Q._validateQuiz({ questions: [{ text: 'Pick one', options: ['Yes', 'yes'], answer: 0 }] }); assert.match(v.error, /same/);
  });
  await test('pass mark must be 40-100', async () => {
    const v = Q._validateQuiz({ passPercent: 20, questions: [{ text: 'Pick one', options: ['a', 'b'], answer: 0 }] }); assert.match(v.error, /pass mark/);
  });
  await test('only the course instructor can save a quiz, for a section of that course', async () => {
    const body = { questions: [{ text: 'Pick one', options: ['a', 'b'], answer: 0 }] };
    let r = res(); await Q.upsert({ params: { courseId: C, sectionId: S }, body, user: { userId: 'stranger' } }, r); assert.strictEqual(r.code, 404);
    r = res(); await Q.upsert({ params: { courseId: C, sectionId: Qz }, body, user: { userId: 'teacher' } }, r); assert.strictEqual(r.code, 400);
    r = res(); await Q.upsert({ params: { courseId: C, sectionId: S }, body, user: { userId: 'teacher' } }, r); assert.strictEqual(r.code, 200); assert.strictEqual(upserted.questions.length, 1);
  });
  await test('students get the questions without the answers', async () => {
    const r = res(); await Q.getForSection({ params: { courseId: C, sectionId: S }, user: { userId: ME } }, r);
    assert.strictEqual(r.code, 200); assert.ok(r.body.data.questions.every((q) => !('answer' in q) && !('explain' in q)));
  });
  await test('people not enrolled cannot see or take the quiz', async () => {
    let r = res(); await Q.getForSection({ params: { courseId: C, sectionId: S }, user: { userId: 'nobody' } }, r); assert.strictEqual(r.code, 403);
    r = res(); await Q.attempt({ params: { quizId: Qz }, body: { answers: [1, 0] }, user: { userId: 'nobody' } }, r); assert.strictEqual(r.code, 403);
  });
  await test('grading happens on the server', async () => {
    let r = res(); await Q.attempt({ params: { quizId: Qz }, body: { answers: [1, 2] }, user: { userId: ME } }, r);
    assert.strictEqual(r.body.data.score, 1); assert.strictEqual(r.body.data.passed, false); assert.strictEqual(r.body.data.results[1].answer, 0);
    r = res(); await Q.attempt({ params: { quizId: Qz }, body: { answers: [1, 0] }, user: { userId: ME } }, r);
    assert.strictEqual(r.body.data.passed, true); assert.strictEqual(saved.score, 2);
  });
  await test('every question must be answered', async () => {
    const r = res(); await Q.attempt({ params: { quizId: Qz }, body: { answers: [1] }, user: { userId: ME } }, r); assert.strictEqual(r.code, 400);
  });
  await test('attempts are limited per day', async () => {
    attempts = 20; const r = res(); await Q.attempt({ params: { quizId: Qz }, body: { answers: [1, 0] }, user: { userId: ME } }, r); assert.strictEqual(r.code, 429); attempts = 0;
  });
  console.log(`\n${passed} passed`);
})();
