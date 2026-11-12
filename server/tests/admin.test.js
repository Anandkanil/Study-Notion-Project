// Admin panel API: admin-only access, subject rules, course status, overview shape.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {};
const JWT = { verify: (t) => ({ t: { userId: 'a', accountType: 'Admin' }, s: { userId: 's', accountType: 'Student' } }[t]) };
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: (v) => /^[a-f0-9]{24}$/.test(v) } } };
  if (req === 'dotenv') return { config() {} };
  if (req === 'jsonwebtoken') return JWT;
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; if (rel.startsWith('models/') || rel.startsWith('config/') || rel.startsWith('mail/')) return fakes[rel] = new Proxy({}, { get: (t, k) => t[k] ?? (() => '') }); }
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
  findById: (id) => q({ _id: id, status: 'Published', courseName: 'React', instructor: 't' }),
  countDocuments: async (f) => (f.category ? courseCountForCategory : 3),
  findByIdAndUpdate: (id, d) => q({ _id: id, courseName: 'React', ...d }),
};
const suspendedIds = new Set();
fakes['models/User'] = { countDocuments: async () => 5, aggregate: async () => [], findById: (id) => q({ _id: id, suspended: suspendedIds.has(id), accountType: id === 'adm2' ? 'Admin' : 'Student', firstName: 'Sam', lastName: 'S', email: 'sam@x.com', instructor: 't' }), updateOne: async (f, u) => { if (u.suspended) suspendedIds.add(String(f._id)); else suspendedIds.delete(String(f._id)); }, updateMany: async () => ({}) };
fakes['models/Purchase'] = { aggregate: async () => [], find: () => q([]) };
const mails = []; const logs = [];
fakes['utils/mailSender'] = Object.assign(async () => ({}), { inBackground: (to, subject) => mails.push({ to, subject }) });
fakes['utils/adminLog'] = async (req, action, summary) => logs.push({ action, summary });
fakes['models/AdminLog'] = {};
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
  // ---- Round 4 admin tools ----
  const U = 'bbbbbbbbbbbbbbbbbbbbbbbb', ADM2 = 'adm2';
  fakes['models/Course'].findById = (id) => q({ _id: id, status: 'Pending', courseName: 'React', instructor: 't' });
  fakes['models/Course'].findByIdAndUpdate = (id, u) => q({ _id: id, courseName: 'React', status: u.status, reviewNote: u.reviewNote });
  await test('sending a course back needs a note for the instructor', async () => {
    assert.strictEqual((await run(A.setCourseStatus, { params: { id: ID }, body: { status: 'Draft', note: '' } })).code, 400);
    const r = await run(A.setCourseStatus, { params: { id: ID }, body: { status: 'Draft', note: 'Add captions to lesson 2' } });
    assert.match(r.body.message, /sent back/); assert.strictEqual(logs.at(-1).action, 'course.reject');
    await new Promise((x) => setTimeout(x, 5)); assert.match(mails.at(-1).subject, /Changes needed/);
  });
  await test('approving a pending course publishes it, logs and emails', async () => {
    const r = await run(A.setCourseStatus, { params: { id: ID }, body: { status: 'Published' } });
    assert.match(r.body.message, /approved/); assert.strictEqual(logs.at(-1).action, 'course.approve');
  });
  await test("can't suspend yourself or another admin; a reason is required", async () => {
    assert.strictEqual((await run(A.setSuspension, { params: { id: ID }, body: { suspended: true, reason: 'spam' }, user: { userId: ID } })).code, 400);
    assert.strictEqual((await run(A.setSuspension, { params: { id: U }, body: { suspended: true, reason: '' }, user: { userId: 'a' } })).code, 400);
  });
  await test('a suspended user is refused on their next request', async () => {
    const r = await run(A.setSuspension, { params: { id: U }, body: { suspended: true, reason: 'Posting spam in Q&A' }, user: { userId: 'a' } });
    assert.strictEqual(r.code, 200);
    JWT.verify = () => ({ userId: U, accountType: 'Student' });
    const r2 = res(); let next = false; await auth({ headers: { authorization: 'Bearer x' }, cookies: {}, body: {} }, r2, () => (next = true));
    assert.strictEqual(next, false); assert.strictEqual(r2.body.suspended, true);
    await run(A.setSuspension, { params: { id: U }, body: { suspended: false }, user: { userId: 'a' } });
    const r3 = res(); next = false; await auth({ headers: { authorization: 'Bearer x' }, cookies: {}, body: {} }, r3, () => (next = true)); assert.strictEqual(next, true);
  });
  await test('CSV export neutralises formulas and quotes commas', async () => {
    const csv = A._toCsv(['a', 'b'], [['=HYPERLINK("x")', 'Smith, J']]);
    assert.strictEqual(csv.split('\r\n')[1], `"'=HYPERLINK(""x"")","Smith, J"`);
  });
  let refundCalls = 0; let pulled = null; let purchaseUpdate = null;
  fakes['config/Razorpay'].payments = { refund: async (pid, o) => { refundCalls++; return { id: 'rfnd_1', amount: o.amount }; } };
  fakes['models/Purchase'].findOne = () => q({ _id: 'p1', orderId: 'order_1', paymentId: 'pay_1', amount: 3200, courses: [{ course: 'c1', courseName: 'React' }], user: { _id: U, firstName: 'Sam', email: 'sam@x.com' } });
  fakes['models/Purchase'].updateOne = async (f, u) => { purchaseUpdate = u; };
  Object.assign(fakes['models/CourseProgress'], { find: () => q([{ _id: 'cp1' }]), deleteMany: async () => ({}) });
  fakes['models/Course'].updateMany = async (f, u) => { pulled = u; };
  await test('refund calls Razorpay for the full amount, removes access and records it', async () => {
    assert.strictEqual((await run(A.refundPurchase, { params: { orderId: 'order_1' }, body: { reason: '' } })).code, 400);
    const r = await run(A.refundPurchase, { params: { orderId: 'order_1' }, body: { reason: 'Bought by mistake' }, user: { userId: 'a' } });
    assert.strictEqual(r.code, 200); assert.strictEqual(refundCalls, 1); assert.deepStrictEqual(pulled, { $pull: { studentsEnrolled: U } }); assert.strictEqual(purchaseUpdate.refund.id, 'rfnd_1');
  });
  console.log(`\n${passed} passed`);
})();
