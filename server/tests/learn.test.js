// Lesson notes and Q&A: who can use them, lesson checks, instructor answers and permissions.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {}; const mails = [];
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: (v) => /^[a-f0-9]{24}$/.test(String(v)) } } };
  if (req === 'dotenv') return { config() {} };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; if (rel.startsWith('models/') || rel.startsWith('mail/')) return fakes[rel] = new Proxy({}, { get: (t, k) => t[k] ?? (() => '') }); }
  return realLoad.apply(this, arguments);
};
fakes['utils/mailSender'] = Object.assign(async () => ({}), { inBackground: (to, subject) => mails.push({ to, subject }) });
const id = (c) => c.repeat(24);
const C = id('c'), L1 = id('1'), L9 = id('9'), Q = id('e'), N = id('f');
const q = (v) => { const p = Promise.resolve(v); ['select', 'populate', 'sort', 'limit'].forEach((k) => (p[k] = () => p)); p.lean = () => p; return p; };
const course = { _id: C, courseName: 'React', instructor: 'teacher', studentsEnrolled: ['stu', 'asker'], courseContent: [{ subSection: [L1] }] };
fakes['models/Course'] = { findById: () => q(course) };
let notes = [];
fakes['models/Note'] = { countDocuments: async () => 0, create: async (d) => { const n = { _id: N, ...d, createdAt: new Date() }; notes.push(n); return n; }, findOneAndUpdate: (f, u) => q(notes.find((n) => n._id === f._id && n.user === f.user) ? { ...u } : null), findOneAndDelete: async (f) => notes.find((n) => n._id === f._id && n.user === f.user) || null };
const question = { _id: Q, course: C, user: 'asker', answers: [], answeredByInstructor: false, resolved: false, save: async () => {} };
fakes['models/Question'] = { findById: (x) => { const p = q({ ...question, user: { _id: 'asker' } }); p.select = () => Promise.resolve(question); return p; }, countDocuments: async () => 0, create: async (d) => ({ _id: Q, ...d }), deleteOne: async () => ({}) };
fakes['models/User'] = { findById: () => q({ email: 'asker@x.com', firstName: 'A' }) };
const L = require(SRV + '/controllers/Learn');
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const call = async (fn, user, req) => { const r = res(); await fn({ params: {}, query: {}, body: {}, ...req, user: { userId: user } }, r); return r; };
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
(async () => {
  await test('someone not enrolled gets 403', async () => assert.strictEqual((await call(L.listNotes, 'stranger', { params: { courseId: C } })).code, 403));
  await test('note on a lesson from another course is refused', async () => assert.strictEqual((await call(L.createNote, 'stu', { params: { courseId: C }, body: { lessonId: L9, text: 'x', at: 5 } })).code, 400));
  await test('note saved with the video time', async () => { const r = await call(L.createNote, 'stu', { params: { courseId: C }, body: { lessonId: L1, text: 'Key idea', at: 75.6 } }); assert.strictEqual(r.code, 201); assert.strictEqual(r.body.data.at, 75); });
  await test("can't edit someone else's note", async () => assert.strictEqual((await call(L.updateNote, 'other', { params: { id: N }, body: { text: 'hack' } })).code, 404));
  await test('short question is refused', async () => assert.strictEqual((await call(L.askQuestion, 'stu', { params: { courseId: C }, body: { lessonId: L1, text: 'why?' } })).code, 400));
  await test('instructor answer is flagged and emails the asker', async () => {
    const r = await call(L.answerQuestion, 'teacher', { params: { id: Q }, body: { text: 'Good question: because of state.' } });
    assert.strictEqual(r.code, 201); assert.strictEqual(question.answers[0].byInstructor, true); assert.strictEqual(question.answeredByInstructor, true);
    await new Promise((r2) => setTimeout(r2, 10)); assert.strictEqual(mails.length, 1); assert.match(mails[0].subject, /answered/);
  });
  await test('a student answer is not flagged and sends no email', async () => {
    mails.length = 0; await call(L.answerQuestion, 'stu', { params: { id: Q }, body: { text: 'I think it is state.' } });
    assert.strictEqual(question.answers[1].byInstructor, false); await new Promise((r2) => setTimeout(r2, 10)); assert.strictEqual(mails.length, 0);
  });
  await test('only the asker or instructor can resolve or delete', async () => {
    assert.strictEqual((await call(L.setResolved, 'stu', { params: { id: Q }, body: { resolved: true } })).code, 403);
    assert.strictEqual((await call(L.setResolved, 'asker', { params: { id: Q }, body: { resolved: true } })).code, 200);
    assert.strictEqual((await call(L.deleteQuestion, 'stu', { params: { id: Q } })).code, 403);
    assert.strictEqual((await call(L.deleteQuestion, 'teacher', { params: { id: Q } })).code, 200);
  });
  console.log(`\n${passed} passed`);
})();
