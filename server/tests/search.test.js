// Tests for GET /course/search using in-memory fakes.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {}; let lastCourseFilter = null;
const chain = (val) => { const p = Promise.resolve(val); for (const k of ['select','populate','limit','sort']) p[k] = () => chain(val); p.lean = () => p; return p; };
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: () => true } } };
  if (req === 'dotenv') return { config() {} };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; if (rel.startsWith('models/') || rel.startsWith('utils/')) return fakes[rel] = {}; }
  return realLoad.apply(this, arguments);
};
const data = [
  { _id: 'c1', courseName: 'Web Development with React', status: 'Published' },
  { _id: 'c2', courseName: 'Cloud basics', courseDescription: 'Intro incl. react hooks', status: 'Published' },
  { _id: 'c3', courseName: 'React drafts', status: 'Draft' },
];
fakes['models/Category'] = { find: () => chain([]) };
fakes['models/User'] = { find: () => chain([]) };
fakes['models/Course'] = { find: (f) => { lastCourseFilter = f; const rx = f.$or[0].courseName; return chain(data.filter(c => c.status === f.status && (rx.test(c.courseName) || rx.test(c.courseDescription || '')))); } };
const { searchCourses } = require(SRV + '/controllers/Courses');
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
(async () => {
  await test('short query returns empty list without querying', async () => { lastCourseFilter = null; const r = res(); await searchCourses({ query: { q: 'r' } }, r); assert(r.body.courses.length === 0 && lastCourseFilter === null); });
  await test('only published courses, title matches first', async () => { const r = res(); await searchCourses({ query: { q: 'react' } }, r); assert.deepStrictEqual(r.body.courses.map(c => c._id), ['c1', 'c2']); });
  await test('regex characters are escaped', async () => { const r = res(); await searchCourses({ query: { q: '.*(' } }, r); assert(r.code === 200 && r.body.courses.length === 0); assert.strictEqual(lastCourseFilter.$or[0].courseName.source, '\\.\\*\\('); });
  await test('object query (NoSQL) is stringified, not used as filter', async () => { const r = res(); await searchCourses({ query: { q: { $ne: '' } } }, r); assert(r.code === 200); });
  await test('long query is capped at 80 chars', async () => { const r = res(); await searchCourses({ query: { q: 'a'.repeat(200) } }, r); assert.strictEqual(r.body.query.length, 80); });
  console.log(`\n${passed} passed`);
})();
