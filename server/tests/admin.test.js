// Admin panel API: admin-only access, subject rules, course status, overview shape.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {};
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: (v) => /^[a-f0-9]{24}$/.test(v) } } };
  if (req === 'dotenv') return { config() {} };
  if (req === 'jsonwebtoken') return { verify: (t) => ({ t: { userId: 'a', accountType: 'Admin' }, s: { userId: 's', accountType: 'Student' } }[t]) };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; if (rel.startsWith('models/')) return fakes[rel] = {}; }
  return realLoad.apply(this, arguments);
};
const q = (v) => { const p = Promise.resolve(v); ['select', 'sort', 'limit', 'skip', 'populate'].forEach((k) => (p[k] = () => p)); p.lean = () => p; return p; };
const ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
let categories = [{ _id: ID, name: 'Web Development', description: 'Build websites', courses: ['c'] }];
let courseCountForCategory = 0;
fakes['models/Category'] = {
  findOne: (f) => q(categories.find((c) => f.name.test(c.name) && (!f._id || c._id !== f._id.$ne)) || null),
  create: async (d) => ({ _id: 'new', ...d }),
  findByIdAndDelete: async () => ({}),
  findByIdAndUpdate: (id, d) => q({ _id: id, ...d, courses: [] }),
};
fakes['models/Course'] = {
  countDocuments: async (f) => (f.category ? courseCountForCategory : 3),
  findByIdAndUpdate: (id, d) => q({ _id: id, courseName: 'React', ...d }),
};
fakes['models/User'] = { countDocuments: async () => 5, aggregate: async () => [] };
fakes['models/Purchase'] = { aggregate: async () => [], find: () => q([]) };
const A = require(SRV + '/controllers/Admin');
const { auth, isAdmin } = require(SRV + '/middlewares/auth');
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const run = async (fn, req) => { const r = res(); await fn({ body: {}, query: {}, params: {}, ...req }, r); return r; };
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
(async () => {
  process.env.JWT_SECRET = 'x';
  await test('students are refused by the admin guard', async () => {
    const r = res(); let next = false; const req = { headers: { authorization: 'Bearer s' }, cookies: {}, body: {} };
    await auth(req, r, () => isAdmin(req, r, () => (next = true)));
    assert.strictEqual(next, false); assert.strictEqual(r.code, 403);
  });
  await test('admins pass the guard', async () => {
    const r = res(); let next = false; const req = { headers: { authorization: 'Bearer t' }, cookies: {}, body: {} };
    await auth(req, r, () => isAdmin(req, r, () => (next = true))); assert.strictEqual(next, true);
  });
  await test('subject needs a name and a description', async () => {
    assert.strictEqual((await run(A.createCategory, { body: { name: 'A', description: 'long enough text' } })).code, 400);
    assert.strictEqual((await run(A.createCategory, { body: { name: 'Data', description: 'short' } })).code, 400);
  });
  await test('duplicate subject name is refused, ignoring case', async () => {
    const r = await run(A.createCategory, { body: { name: 'web development', description: 'Another one here' } }); assert.strictEqual(r.code, 409);
  });
  await test('new subject is created', async () => {
    const r = await run(A.createCategory, { body: { name: 'Data Science', description: 'Numbers and models' } }); assert.strictEqual(r.code, 201); assert.strictEqual(r.body.message, 'Subject added');
  });
  await test('subject with courses cannot be deleted', async () => {
    courseCountForCategory = 2; const r = await run(A.deleteCategory, { params: { id: ID } }); assert.strictEqual(r.code, 409); assert.match(r.body.message, /2 courses/);
  });
  await test('empty subject is deleted', async () => {
    courseCountForCategory = 0; const r = await run(A.deleteCategory, { params: { id: ID } }); assert.strictEqual(r.code, 200);
  });
  await test('bad ids are rejected', async () => { assert.strictEqual((await run(A.deleteCategory, { params: { id: 'x' } })).code, 400); assert.strictEqual((await run(A.getUser, { params: { id: '{"$ne":1}' } })).code, 400); });
  await test('course status only Published or Draft', async () => {
    assert.strictEqual((await run(A.setCourseStatus, { params: { id: ID }, body: { status: 'Deleted' } })).code, 400);
    const r = await run(A.setCourseStatus, { params: { id: ID }, body: { status: 'Draft' } }); assert.strictEqual(r.code, 200); assert.match(r.body.message, /unpublished/);
  });
  await test('overview always returns 12 months', async () => {
    const r = await run(A.getOverview, {}); assert.strictEqual(r.code, 200); assert.strictEqual(r.body.data.months.length, 12); assert.strictEqual(r.body.data.totals.students, 5);
  });
  console.log(`\n${passed} passed`);
})();
