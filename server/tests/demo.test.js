// Read-only demo sessions: sign-in, write blocking, and hiding real people's details.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, '\n  ', e.stack); process.exitCode = 1; } };
const res = () => { const r = { cookies: {} }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); r.cookie = (k, v) => (r.cookies[k] = v, r); return r; };

// --- fakes ---
const users = [];
let nextId = 1;
const doc = (u) => ({ ...u, toObject() { const { toObject, ...rest } = this; return { ...rest }; } });
const User = {
  find: (q) => ({ select: async () => users.filter((u) => q.email.test(u.email) && (!q.accountType || u.accountType === q.accountType)).map(doc) }),
  findOne: async (q) => { const u = users.find((x) => (q.email instanceof RegExp ? q.email.test(x.email) && (!q.accountType || x.accountType === q.accountType) : x.email === q.email)); return u ? doc(u) : null; },
  findById: (id) => ({ populate: async () => { const u = users.find((x) => x._id === id); return u ? doc(u) : null; } }),
  updateOne: async (q, u) => { const d = users.find((x) => x._id === q._id); Object.assign(d, u.$set); },
  create: async (d) => { const u = { _id: `u${nextId++}`, ...d }; users.push(u); return doc(u); },
};
const signed = [];
const fakes = { 'models/User': User, 'models/Profile': { create: async () => ({ _id: 'p1' }) } };
const real = Module._load;
Module._load = function (req, parent) {
  if (req === 'bcrypt') return { hash: async () => 'hashed' };
  if (req === 'jsonwebtoken') return { sign: (p) => { signed.push(p); return `tok${signed.length}`; }, verify: (t) => JSON.parse(t) };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; }
  return real.apply(this, arguments);
};

(async () => {
  process.env.JWT_SECRET = 'x';
  const D = require(SRV + '/utils/demoSession');
  const { demoLogin } = require(SRV + '/controllers/Demo');

  users.push({ _id: 'a', email: 'ananya.sharma@demo.studynotion.test', accountType: 'Student', firstName: 'Ananya', courses: ['c1'], learningDays: [] });
  users.push({ _id: 'b', email: 'rahul.verma@demo.studynotion.test', accountType: 'Student', firstName: 'Rahul', courses: ['c1', 'c2', 'c3'], learningDays: [] });
  users.push({ _id: 'm', email: 'meera.krishnan@demo.studynotion.test', accountType: 'Instructor', firstName: 'Meera' });
  users.push({ _id: 'r', email: 'real@gmail.com', accountType: 'Student', firstName: 'Real' });

  await test('demo login: rejects an unknown role', async () => { const r = res(); await demoLogin({ body: { role: 'owner' } }, r); assert.strictEqual(r.code, 400); });
  await test('demo student: the demo student with most courses, demo token, streak filled in', async () => {
    const r = res(); await demoLogin({ body: { role: 'student' } }, r);
    assert.strictEqual(r.code, 200); assert.strictEqual(r.body.data.firstName, 'Rahul'); assert.strictEqual(r.body.data.demo, true);
    assert.strictEqual(signed.at(-1).demo, true); assert(r.cookies.token);
    assert(users.find((u) => u._id === 'b').learningDays.length >= 7); assert.strictEqual(r.body.data.password, undefined);
  });
  await test('demo instructor: Meera', async () => { const r = res(); await demoLogin({ body: { role: 'instructor' } }, r); assert.strictEqual(r.body.data.firstName, 'Meera'); });
  await test('demo admin: created once on a .test address, then reused', async () => {
    const r1 = res(); await demoLogin({ body: { role: 'admin' } }, r1);
    const r2 = res(); await demoLogin({ body: { role: 'admin' } }, r2);
    const admins = users.filter((u) => u.accountType === 'Admin');
    assert.strictEqual(admins.length, 1); assert(admins[0].email.endsWith('@demo.studynotion.test')); assert.strictEqual(r2.body.data.accountType, 'Admin');
  });

  const req = (method, url) => ({ method, originalUrl: url });
  await test('read-only: GETs and read POSTs allowed, writes refused', async () => {
    assert(D.isAllowed(req('GET', '/api/v1/admin/users')));
    assert(D.isAllowed(req('POST', '/api/v1/course/getFullCourseDetails')));
    assert(D.isAllowed(req('PUT', '/api/v1/profile/last-lesson')));
    assert(!D.isAllowed(req('GET', '/api/v1/admin/export/users?x=1')), 'CSV export is off');
    for (const [m, u] of [['POST', '/api/v1/payment/capturePayment'], ['PATCH', '/api/v1/admin/users/x/suspension'], ['POST', '/api/v1/admin/purchases/o/refund'], ['DELETE', '/api/v1/profile/deleteProfile'], ['PUT', '/api/v1/profile/updateProfile'], ['POST', '/api/v1/course/updateCourseProgress'], ['POST', '/api/v1/auth/changepassword']]) {
      assert(!D.isAllowed(req(m, u)), `${m} ${u}`);
    }
  });

  await test('mask: real people lose email, surname, phone and photo; demo accounts unchanged', async () => {
    const out = D.maskPersonal({ data: [
      { firstName: 'Priya', lastName: 'Menon', email: 'priya.menon@gmail.com', image: 'https://lh3.googleusercontent.com/x', additionalDetails: { contactNumber: '9876543210', about: 'hi' } },
      { firstName: 'Meera', lastName: 'Krishnan', email: 'meera.krishnan@demo.studynotion.test', image: 'img' },
      { action: 'refund', ip: '1.2.3.4', by: { email: 'admin@gmail.com', firstName: 'A', lastName: 'Bee' } },
    ] });
    const [p, m, log] = out.data;
    assert.strictEqual(p.email, 'p•••@gmail.com'); assert.strictEqual(p.lastName, 'M.'); assert(p.image.includes('dicebear'));
    assert.strictEqual(p.additionalDetails.contactNumber, undefined); assert.strictEqual(p.additionalDetails.about, 'hi');
    assert.deepStrictEqual([m.email, m.lastName, m.image], ['meera.krishnan@demo.studynotion.test', 'Krishnan', 'img']);
    assert.strictEqual(log.ip, undefined); assert.strictEqual(log.by.email, 'a•••@gmail.com');
  });

  await test('auth middleware: demo write -> 403; demo read -> masked response; normal session untouched', async () => {
    const { auth } = require(SRV + '/middlewares/auth');
    fakes['models/User'].findById = () => ({ select: () => ({ lean: async () => ({ suspended: false }) }) });
    const tok = (demo) => JSON.stringify({ userId: 'b', accountType: 'Admin', ...(demo ? { demo: true } : {}) });
    let r = res(); let called = false;
    await auth({ method: 'PATCH', originalUrl: '/api/v1/admin/users/r/suspension', cookies: { token: tok(true) }, headers: {}, body: {} }, r, () => { called = true; });
    assert.strictEqual(r.code, 403); assert.strictEqual(r.body.demo, true); assert(!called);
    r = res(); called = false;
    await auth({ method: 'GET', originalUrl: '/api/v1/admin/users', cookies: { token: tok(true) }, headers: {}, body: {} }, r, () => { called = true; });
    assert(called); r.json({ data: [{ email: 'real@gmail.com', lastName: 'Kumar' }] });
    assert.deepStrictEqual(r.body.data[0], { email: 'r•••@gmail.com', lastName: 'K.' });
    r = res(); called = false;
    await auth({ method: 'PATCH', originalUrl: '/api/v1/admin/users/r/suspension', cookies: { token: tok(false) }, headers: {}, body: {} }, r, () => { called = true; });
    assert(called); r.json({ email: 'real@gmail.com' }); assert.strictEqual(r.body.email, 'real@gmail.com');
  });

  console.log(`${passed} passed`);
})();
