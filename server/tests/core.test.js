// Unit tests for the Phase 3 backend fixes, using in-memory fakes instead of MongoDB/Razorpay.
const Module = require('module'); const path = require('path'); const crypto = require('crypto'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const isHex24 = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/.test(v);
const q = (val) => { const p = Promise.resolve(val); p.select = () => q(val); p.populate = () => q(val); p.exec = () => p; return p; };
const fakes = {}; const mail = [];
const realLoad = Module._load;
Module._load = function (req, parent, isMain) {
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: isHex24 } } };
  if (req === 'bcrypt') return { hash: async (p) => 'bcrypt:' + p, compare: async (a, b) => b === 'bcrypt:' + a };
  if (req === 'dotenv') return { config() {} };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) {
    const rel = path.relative(SRV, abs).replace(/\.js$/, '');
    if (fakes[rel]) return fakes[rel];
    if (rel.startsWith('models/') || rel.startsWith('mail/')) return fakes[rel] = new Proxy({}, { get: (t, k) => t[k] ?? (() => '') });
  }
  return realLoad.apply(this, arguments);
};
const res = () => { const r = { code: 200, body: null }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const id = (n) => String(n).padStart(24, 'a');
let passed = 0; const test = async (name, fn) => { try { await fn(); passed++; console.log('PASS', name); } catch (e) { console.log('FAIL', name, '\n  ', e.message); process.exitCode = 1; } };

(async () => {
  // ---------- courseOwnership ----------
  const courses = { [id(1)]: { _id: id(1), instructor: id(100), courseContent: [id(11)] } };
  const sections = { [id(11)]: { subSection: [id(111)] } };
  fakes['models/Course'] = { findById: (cid) => q(courses[cid] || null), findOne: ({ courseContent }) => q(Object.values(courses).find(c => c.courseContent.includes(courseContent)) || null) };
  fakes['models/Section'] = { exists: async ({ _id, subSection }) => !!(sections[_id] && sections[_id].subSection.includes(subSection)) };
  const { requireCourseOwner } = require(SRV + '/middlewares/courseOwnership');
  const runMw = async (body, uid) => { const r = res(); let nexted = false; await requireCourseOwner({ body, user: { userId: uid } }, r, () => { nexted = true; }); return { r, nexted }; };
  await test('owner can edit own course', async () => assert((await runMw({ courseId: id(1) }, id(100))).nexted));
  await test('other instructor is refused (403)', async () => { const { r, nexted } = await runMw({ courseId: id(1) }, id(200)); assert(!nexted && r.code === 403); });
  await test('section of own course resolves owner', async () => assert((await runMw({ sectionId: id(11) }, id(100))).nexted));
  await test('section from another course with own courseId is refused', async () => { courses[id(2)] = { _id: id(2), instructor: id(200), courseContent: [id(22)] }; const { r, nexted } = await runMw({ sectionId: id(22), courseId: id(1) }, id(100)); assert(!nexted && r.code === 400); });
  await test('lecture not in section is refused', async () => { const { r, nexted } = await runMw({ sectionId: id(11), subSectionId: id(999) }, id(100)); assert(!nexted && r.code === 400); });
  await test('lecture in own section passes', async () => assert((await runMw({ sectionId: id(11), subSectionId: id(111) }, id(100))).nexted));
  await test('missing ids -> 400', async () => assert((await runMw({}, id(100))).r.code === 400));
  await test('bad id / NoSQL object -> 400', async () => assert((await runMw({ courseId: { $ne: null } }, id(100))).r.code === 400));

  // ---------- reset password ----------
  const users = []; const mkUser = (o) => ({ ...o, async save() {} });
  users.push(mkUser({ email: 'a@x.com', firstName: 'A', password: 'old' }));
  fakes['models/User'] = { findOne: async (f) => users.find(u => Object.entries(f).every(([k, v]) => u[k] === v)) || null };
  fakes['utils/mailSender'] = Object.assign(async (to, subj, body) => { mail.push({ to, subj, body }); return { ok: 1 }; }, { inBackground: (to, subj, body) => { mail.push({ to, subj, body }); } });
  fakes['mail/templates/passwordResetLink'] = { passwordReset: (e, n, url) => url };
  process.env.FRONTEND_URL = 'https://studynotion.example/';
  const RP = require(SRV + '/controllers/ResetPassword');
  let link;
  await test('reset link uses FRONTEND_URL, DB stores only a hash', async () => {
    const r = res(); await RP.createPasswordResetToken({ body: { email: 'a@x.com' } }, r);
    link = mail.at(-1).body; const tok = link.split('/').pop();
    assert(link.startsWith('https://studynotion.example/reset-password/'), link);
    assert.notStrictEqual(users[0].resetPasswordToken, tok); assert.strictEqual(users[0].resetPasswordToken, crypto.createHash('sha256').update(tok).digest('hex'));
  });
  await test('unknown email gets same 200 answer, no mail', async () => { const n = mail.length; const r = res(); await RP.createPasswordResetToken({ body: { email: 'no@x.com' } }, r); assert(r.code === 200 && mail.length === n); });
  await test('stored hash itself cannot be used as the token', async () => { const r = res(); await RP.resetPassword({ body: { password: 'newpass123', confirmPassword: 'newpass123', token: users[0].resetPasswordToken } }, r); assert.strictEqual(r.code, 400); });
  await test('valid token resets once, then is rejected', async () => {
    const tok = link.split('/').pop(); const r = res(); await RP.resetPassword({ body: { password: 'newpass123', confirmPassword: 'newpass123', token: tok } }, r);
    assert(r.code === 200 && users[0].password === 'bcrypt:newpass123' && users[0].resetPasswordToken === undefined);
    const r2 = res(); await RP.resetPassword({ body: { password: 'another123', confirmPassword: 'another123', token: tok } }, r2); assert.strictEqual(r2.code, 400);
  });
  await test('expired token rejected', async () => {
    await RP.createPasswordResetToken({ body: { email: 'a@x.com' } }, res()); users[0].resetPasswordExpires = Date.now() - 1;
    const r = res(); await RP.resetPassword({ body: { password: 'newpass123', confirmPassword: 'newpass123', token: mail.at(-1).body.split('/').pop() } }, r); assert.strictEqual(r.code, 400);
  });

  // ---------- payments ----------
  process.env.RAZORPAY_KEY_SECRET = 'sekret';
  const pcourses = { [id(5)]: { _id: id(5), price: 499, courseName: 'Cheap', status: 'Published', studentsEnrolled: [] }, [id(6)]: { _id: id(6), price: 7999, courseName: 'Pricey', status: 'Published', studentsEnrolled: [] }, [id(7)]: { _id: id(7), price: 999, courseName: 'Unreviewed', status: 'Pending', studentsEnrolled: [] } };
  const orders = {}; const progress = [];
  fakes['config/Razorpay'] = { orders: { create: async (o) => { const oid = 'order_' + Object.keys(orders).length; orders[oid] = { id: oid, ...o }; return orders[oid]; }, fetch: async (oid) => orders[oid] } };
  fakes['models/Course'] = { findById: (cid) => q(pcourses[cid] || null), findOneAndUpdate: async ({ _id }, upd) => { const c = pcourses[_id]; if (!c) return null; const u = upd.$addToSet.studentsEnrolled; if (!c.studentsEnrolled.includes(u)) c.studentsEnrolled.push(u); return c; } };
  fakes['models/CourseProgress'] = { findOne: async (f) => progress.find(p => p.courseID === f.courseID && p.userId === f.userId) || null, create: async (o) => { const p = { _id: 'p' + progress.length, ...o }; progress.push(p); return p; } };
  fakes['models/User'] = { findByIdAndUpdate: async (uid) => ({ email: 's@x.com', firstName: 'S' }), findById: async () => ({ email: 's@x.com', firstName: 'S' }) };
  fakes['mail/templates/courseEnrollmentEmail'] = { courseEnrollmentEmail: () => '' };
  fakes['mail/templates/paymentSuccessEmail'] = { paymentSuccessEmail: () => '' };
  const P = require(SRV + '/controllers/Payments');
  const sign = (o, p) => crypto.createHmac('sha256', 'sekret').update(`${o}|${p}`).digest('hex');
  const buyer = id(300);
  let orderId;
  await test('order records buyer and course ids in notes', async () => { const r = res(); await P.capturePayment({ body: { courses: [id(5)] }, user: { userId: buyer } }, r); orderId = r.body.message.id; assert(r.body.success && orders[orderId].notes.userId === buyer && orders[orderId].notes.c0 === id(5) && orders[orderId].amount === 49900); });
  await test('swapping course ids in verify does NOT enrol the expensive course', async () => {
    const r = res(); await P.verifyPayment({ body: { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1'), courses: [id(6)] }, user: { userId: buyer } }, r);
    assert(r.code === 200 && r.body.success === true); assert(pcourses[id(5)].studentsEnrolled.includes(buyer)); assert(!pcourses[id(6)].studentsEnrolled.includes(buyer));
  });
  await test('a course that is not published cannot be bought', async () => {
    const r = res(); await P.capturePayment({ body: { courses: [id(7)] }, user: { userId: buyer } }, r);
    assert.strictEqual(r.code, 400); assert.match(r.body.message, /isn't available/);
  });
  await test('replaying verify is idempotent (no duplicate enrolment/progress)', async () => { await P.verifyPayment({ body: { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') }, user: { userId: buyer } }, res()); assert(pcourses[id(5)].studentsEnrolled.filter(x => x === buyer).length === 1 && progress.length === 1); });
  await test('bad signature -> 400, success false (boolean)', async () => { const r = res(); await P.verifyPayment({ body: { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: 'x'.repeat(64) }, user: { userId: buyer } }, r); assert(r.code === 400 && r.body.success === false); });
  await test("another user's paid order can't be claimed", async () => { const r = res(); await P.verifyPayment({ body: { razorpay_order_id: orderId, razorpay_payment_id: 'pay_1', razorpay_signature: sign(orderId, 'pay_1') }, user: { userId: id(301) } }, r); assert.strictEqual(r.code, 403); });
  await test('already-enrolled course -> 409 on new order', async () => { const r = res(); await P.capturePayment({ body: { courses: [id(5)] }, user: { userId: buyer } }, r); assert.strictEqual(r.code, 409); });

  console.log(`\n${passed} passed`);
})();
