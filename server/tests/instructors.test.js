// Instructor tools: discount codes at checkout, ownership checks, review replies, announcements.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {}; const mails = [];
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Types: { ObjectId: Object.assign(function (v) { return v; }, { isValid: (v) => /^[a-f0-9]{24}$/.test(v) }) } };
  if (req === 'dotenv') return { config() {} };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; if (rel.startsWith('models/') || rel.startsWith('config/') || rel.startsWith('mail/')) return fakes[rel] = new Proxy({}, { get: (t, k) => t[k] ?? (() => '') }); }
  return realLoad.apply(this, arguments);
};
fakes['utils/mailSender'] = Object.assign(async () => ({}), { inBackground: (to, subject) => mails.push({ to, subject }) });
const q = (v) => { const p = Promise.resolve(v); ['select', 'populate', 'sort', 'limit'].forEach((k) => (p[k] = () => p)); p.lean = () => p; return p; };
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const C1 = 'c1c1c1c1c1c1c1c1c1c1c1c1'.replace(/c/g, 'a'), C2 = 'b2b2b2b2b2b2b2b2b2b2b2b2'.replace(/b/g, 'b').replace(/2/g, 'b'), R = 'dddddddddddddddddddddddd';
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };

let coupons = [];
fakes['models/Coupon'] = { find: (f) => q(coupons.filter((c) => c.code === f.code && f.course.$in.includes(c.course))), exists: async (f) => coupons.some((c) => c.code === f.code && c.course === f.course), create: async (d) => d, updateOne: async () => ({}) };
const { findCoupon, discounted } = require(SRV + '/utils/coupons');

(async () => {
  const day = 24 * 3600e3;
  await test('discounted price rounds to whole rupees', async () => { assert.strictEqual(discounted(4000, 20), 3200); assert.strictEqual(discounted(999, 33), 669); });
  await test('code is case-insensitive and course-specific', async () => {
    coupons = [{ code: 'LAUNCH20', course: C1, percentOff: 20, active: true, uses: 0, maxUses: null, expiresAt: null }];
    assert.strictEqual((await findCoupon('launch20', [C1])).coupon.percentOff, 20);
    assert.match((await findCoupon('LAUNCH20', [C2])).error, /isn't a valid code/);
  });
  await test('expired, used-up and switched-off codes explain why', async () => {
    coupons = [{ code: 'OLD', course: C1, percentOff: 10, active: true, uses: 0, maxUses: null, expiresAt: new Date(Date.now() - day) }];
    assert.match((await findCoupon('OLD', [C1])).error, /expired/);
    coupons = [{ code: 'FULL', course: C1, percentOff: 10, active: true, uses: 5, maxUses: 5, expiresAt: null }];
    assert.match((await findCoupon('FULL', [C1])).error, /maximum/);
    coupons = [{ code: 'OFF', course: C1, percentOff: 10, active: false, uses: 0, maxUses: null, expiresAt: null }];
    assert.match((await findCoupon('OFF', [C1])).error, /switched off/);
  });

  // Checkout total with a code: only the matching course is discounted
  let orderArgs = null;
  fakes['config/Razorpay'] = { orders: { create: async (o) => { orderArgs = o; return { id: 'order_x', ...o }; } } };
  const prices = { [C1]: 4000, [C2]: 1000 };
  fakes['models/Course'] = { findById: (id) => q({ _id: id, price: prices[id], status: 'Published', studentsEnrolled: [], courseName: 'X' }) };
  const P = require(SRV + '/controllers/Payments');
  await test('code applies to its course only; order notes record it', async () => {
    coupons = [{ code: 'LAUNCH20', course: C1, percentOff: 20, active: true, uses: 0, maxUses: null, expiresAt: null }];
    const r = res(); await P.capturePayment({ body: { courses: [C1, C2], couponCode: 'launch20' }, user: { userId: 'u' } }, r);
    assert.strictEqual(r.body.success, true); assert.strictEqual(orderArgs.amount, (3200 + 1000) * 100); assert.strictEqual(orderArgs.notes.coupon, `LAUNCH20:20:${C1}`);
  });
  await test('bad code stops checkout with a clear message', async () => {
    const r = res(); await P.capturePayment({ body: { courses: [C2], couponCode: 'LAUNCH20' }, user: { userId: 'u' } }, r); assert.strictEqual(r.code, 400);
  });

  // Instructor ownership
  const I = require(SRV + '/controllers/Instructor');
  fakes['models/Course'].findOne = (f) => q(f.instructor === 'owner' ? { _id: f._id, courseName: 'React', instructor: 'owner', studentsEnrolled: Array.from({ length: 60 }, (_, i) => 's' + i) } : null);
  await test("another instructor's course is refused", async () => { const r = res(); await I.listCoupons({ params: { courseId: C1 }, user: { userId: 'someone' } }, r); assert.strictEqual(r.code, 404); });
  await test('coupon rules: code format, 1–90 %, future expiry', async () => {
    const make = async (body) => { const r = res(); await I.createCoupon({ params: { courseId: C1 }, body, user: { userId: 'owner' } }, r); return r.code; };
    assert.strictEqual(await make({ code: 'a', percentOff: 10 }), 400);
    assert.strictEqual(await make({ code: 'SAVE', percentOff: 95 }), 400);
    assert.strictEqual(await make({ code: 'SAVE', percentOff: 10, expiresAt: '2020-01-01' }), 400);
    coupons = []; assert.strictEqual(await make({ code: 'save10', percentOff: 10 }), 201);
  });

  Object.assign(fakes['models/RatingAndReview'], { findById: (id) => ({ select: async () => ({ _id: id, course: C1 }) }), findByIdAndUpdate: () => q({ reply: { text: 'Thanks!' } }) });
  await test("can't reply to reviews of someone else's course", async () => { const r = res(); await I.replyToReview({ params: { reviewId: R }, body: { text: 'Thanks!' }, user: { userId: 'someone' } }, r); assert.strictEqual(r.code, 403); });
  await test('owner can reply', async () => { const r = res(); await I.replyToReview({ params: { reviewId: R }, body: { text: 'Thanks!' }, user: { userId: 'owner' } }, r); assert.strictEqual(r.body.message, 'Reply posted'); });

  Object.assign(fakes['models/User'], { find: (f) => ({ select: () => ({ limit: (n) => ({ lean: async () => f._id.$in.slice(0, n).map((id) => ({ email: id + '@x.com', firstName: id })) }) }) }), findById: () => q({ firstName: 'T' }) });
  Object.assign(fakes['models/Announcement'], { create: async (d) => ({ ...d, _id: 'a1', createdAt: new Date() }) });
  await test('announcement emails at most 50 students and says so', async () => {
    mails.length = 0; const r = res();
    await I.createAnnouncement({ params: { courseId: C1 }, body: { title: 'Live Q&A', body: 'Join us on Friday at 7 pm.', email: true }, user: { userId: 'owner' } }, r);
    assert.strictEqual(r.code, 201); assert.strictEqual(mails.length, 50); assert.match(r.body.message, /first 50/);
  });
  console.log(`\n${passed} passed`);
})();
