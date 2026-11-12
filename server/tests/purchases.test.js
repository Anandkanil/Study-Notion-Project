// Purchases: recorded once per verified order, listed per student, used for the receipt amount.
const Module = require('module'); const path = require('path'); const assert = require('assert'); const crypto = require('crypto');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {}; const mails = [];
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: () => true } }, Schema: function () {}, model: () => ({}) };
  if (req === 'dotenv') return { config() {} };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; if (rel.startsWith('models/') || rel.startsWith('mail/') || rel.startsWith('config/')) return fakes[rel] = new Proxy({}, { get: (t, k) => t[k] ?? (() => '') }); }
  return realLoad.apply(this, arguments);
};
process.env.RAZORPAY_KEY_SECRET = 'test-secret';
const purchases = new Map();
const lean = (v) => { const p = Promise.resolve(v); p.lean = () => p; p.select = () => p; p.sort = () => p; return p; };
fakes['config/Razorpay'] = { orders: { fetch: async (id) => ({ id, amount: 400000, currency: 'INR', notes: { userId: 'u1', c0: 'c1' } }) } };
fakes['models/Course'] = {
  findOneAndUpdate: async () => ({ courseName: 'React', thumbnail: '' }),
  find: () => lean([{ _id: 'c1', courseName: 'React', price: 4000 }]),
};
fakes['models/CourseProgress'] = { findOne: async () => ({ _id: 'cp' }), create: async () => ({ _id: 'cp' }) };
fakes['models/User'] = { findByIdAndUpdate: async () => ({ email: 'a@x.com', firstName: 'A' }), findById: async () => ({ email: 'a@x.com', firstName: 'A' }) };
fakes['models/Purchase'] = {
  updateOne: async (q, u) => { if (!purchases.has(q.orderId)) purchases.set(q.orderId, { ...u.$setOnInsert, createdAt: new Date() }); },
  find: (q) => lean([...purchases.values()].filter((p) => p.user === q.user)),
  findOne: (q) => lean([...purchases.values()].find((p) => p.orderId === q.orderId && p.user === q.user) || null),
};
fakes['utils/mailSender'] = Object.assign(async () => ({}), { inBackground: (to, subj, body) => mails.push({ to, subj, body }) });
fakes['mail/templates/paymentSuccessEmail'] = { paymentSuccessEmail: (name, amount) => `paid ${amount}` };
const P = require(SRV + '/controllers/Payments');
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const sign = (o, p) => crypto.createHmac('sha256', 'test-secret').update(`${o}|${p}`).digest('hex');
const verify = async (o, p) => { const r = res(); await P.verifyPayment({ body: { razorpay_order_id: o, razorpay_payment_id: p, razorpay_signature: sign(o, p) }, user: { userId: 'u1' } }, r); return r; };
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
(async () => {
  await test('verified payment records a purchase with Razorpay amount in rupees', async () => {
    const r = await verify('order_1', 'pay_1'); assert.strictEqual(r.code, 200);
    const p = purchases.get('order_1'); assert.strictEqual(p.amount, 4000); assert.strictEqual(p.courses[0].courseName, 'React'); assert.strictEqual(p.paymentId, 'pay_1');
  });
  await test('verifying the same order twice keeps one purchase', async () => { await verify('order_1', 'pay_1'); assert.strictEqual(purchases.size, 1); });
  await test('purchases list returns only this student', async () => {
    purchases.set('order_x', { user: 'u2', orderId: 'order_x', amount: 1 });
    const r = res(); await P.getPurchases({ user: { userId: 'u1' } }, r); assert.deepStrictEqual(r.body.data.map((p) => p.orderId), ['order_1']);
  });
  await test('receipt email uses the recorded amount, not the one the browser sends', async () => {
    const r = res(); await P.sendPaymentSuccessEmail({ body: { orderId: 'order_1', paymentId: 'pay_1', amount: 100 }, user: { userId: 'u1' } }, r);
    assert.strictEqual(mails.at(-1).body, 'paid 4000');
  });
  console.log(`\n${passed} passed`);
})();

// Backfill: rebuilds receipts for paid orders that have no Purchase yet
(async () => {
  await new Promise((r) => setTimeout(r, 50)); // after the tests above
  const realOrders = fakes['config/Razorpay'].orders;
  fakes['config/Razorpay'].orders = Object.assign(realOrders, {
    all: async ({ skip }) => ({ items: skip ? [] : [
      { id: 'order_old', status: 'paid', amount: 120000, currency: 'INR', created_at: 1733600000, notes: { userId: 'u1', c0: 'c1' } },
      { id: 'order_unpaid', status: 'attempted', amount: 5000, notes: { userId: 'u1', c0: 'c1' } },
      { id: 'order_1', status: 'paid', amount: 400000, notes: { userId: 'u1', c0: 'c1' } },
      { id: 'order_other_shop', status: 'paid', amount: 100, notes: {} },
    ] }),
    fetchPayments: async () => ({ items: [{ id: 'pay_old', status: 'captured', created_at: 1733600100 }] }),
  });
  fakes['models/Purchase'].exists = async (q) => purchases.has(q.orderId);
  const before = purchases.size;
  const { backfillPurchases } = require(SRV + '/utils/backfillPurchases');
  await test('backfill adds only paid StudyNotion orders that have no receipt', async () => {
    fakes['models/Purchase'].updateOne = async (q, u) => { if (purchases.has(q.orderId)) return { upsertedCount: 0 }; purchases.set(q.orderId, u.$setOnInsert); return { upsertedCount: 1 }; };
    const r = await backfillPurchases();
    assert.strictEqual(r.added, 1); assert.strictEqual(purchases.size, before + 1);
    const p = purchases.get('order_old'); assert.strictEqual(p.amount, 1200); assert.strictEqual(p.paymentId, 'pay_old'); assert.strictEqual(p.createdAt.getTime(), 1733600100000);
  });
  await test('running backfill again adds nothing', async () => { const r = await backfillPurchases(); assert.strictEqual(r.added, 0); });
  console.log(`\n${passed} passed`);
})();
