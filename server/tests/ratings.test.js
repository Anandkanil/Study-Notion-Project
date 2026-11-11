// Tests for createRating validation and the public course list, using in-memory fakes.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {};
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: () => true } } };
  if (req === 'dotenv') return { config() {} };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; if (rel.startsWith('models/') || rel.startsWith('utils/')) return fakes[rel] = {}; }
  return realLoad.apply(this, arguments);
};
const saved = []; let enrolled = true; let already = false;
fakes['models/Course'] = {
  findOne: async () => (enrolled ? { _id: 'c1' } : null),
  findByIdAndUpdate: async () => ({}),
  find: (f) => { const p = Promise.resolve([{ _id: 'c1', status: 'Published', courseName: 'A' }]); p.select = (sel) => { fakes._sel = sel; fakes._filter = f; return p; }; p.populate = () => p; p.lean = () => p; return p; },
  aggregate: async () => [{ _id: 'c1', n: 7 }],
};
function RatingAndReview(doc) { Object.assign(this, doc); this.save = async () => { saved.push(doc); return { _id: 'r1', ...doc }; }; }
RatingAndReview.findOne = async () => (already ? { _id: 'r0' } : null);
fakes['models/RatingAndReview'] = RatingAndReview;
const { createRating } = require(SRV + '/controllers/RatingAndReview');
const { getAllCourses } = require(SRV + '/controllers/Courses');
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const call = async (body) => { const r = res(); await createRating({ body: { courseId: 'c1', ...body }, user: { userId: 'u1' } }, r); return r; };
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
(async () => {
  await test('rating 0 rejected', async () => assert.strictEqual((await call({ rating: 0, review: 'ok' })).code, 400));
  await test('rating 6 rejected', async () => assert.strictEqual((await call({ rating: 6, review: 'ok' })).code, 400));
  await test('rating 3.5 rejected', async () => assert.strictEqual((await call({ rating: 3.5, review: 'ok' })).code, 400));
  await test('empty review rejected', async () => assert.strictEqual((await call({ rating: 4, review: '   ' })).code, 400));
  await test('review over 500 chars rejected', async () => assert.strictEqual((await call({ rating: 4, review: 'x'.repeat(501) })).code, 400));
  await test('not enrolled rejected', async () => { enrolled = false; const r = await call({ rating: 4, review: 'Good' }); enrolled = true; assert.strictEqual(r.code, 400); assert.match(r.body.message, /enrolled/); });
  await test('second review rejected with friendly copy', async () => { already = true; const r = await call({ rating: 4, review: 'Good' }); already = false; assert.strictEqual(r.body.message, "You've already reviewed this course."); });
  await test('valid review saved trimmed, string rating accepted', async () => { const r = await call({ rating: '5', review: '  Great course  ' }); assert.strictEqual(r.code, 201); assert.deepStrictEqual({ rating: saved.at(-1).rating, review: saved.at(-1).review }, { rating: 5, review: 'Great course' }); });
  await test('public course list: published only, no student ids, has count', async () => { const r = res(); await getAllCourses({}, r); assert.deepStrictEqual(fakes._filter, { status: 'Published' }); assert.strictEqual(fakes._sel, '-studentsEnrolled'); assert.strictEqual(r.body.courses[0].studentsCount, 7); });
  console.log(`\n${passed} passed`);
})();
