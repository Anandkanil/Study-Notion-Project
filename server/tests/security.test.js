// Tests for rate limiting, input sanitising, OTP attempt cap and 7-day sessions.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {};
let signed = null;
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: () => true } } };
  if (req === 'dotenv') return { config() {} };
  if (req === 'bcrypt') return { hash: async (p) => 'h:' + p, compare: async (a, b) => b === 'h:' + a };
  if (req === 'jsonwebtoken') return { sign: (p, s, o) => { signed = o; return 'tok'; } };
  if (req === 'otp-generator') return { generate: () => '123456' };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; if (rel.startsWith('models/') || rel.startsWith('utils/') || rel.startsWith('mail/')) return fakes[rel] = new Proxy({}, { get: (t, k) => t[k] ?? (() => '') }); }
  return realLoad.apply(this, arguments);
};
const { rateLimit, emailKey } = require(SRV + '/middlewares/rateLimit');
const { sanitizeInput, securityHeaders } = require(SRV + '/middlewares/security');
const res = () => { const r = { code: 200, headers: {} }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); r.set = (k, v) => { if (typeof k === 'object') Object.assign(r.headers, k); else r.headers[k] = v; return r; }; r.removeHeader = () => {}; r.cookie = () => r; return r; };
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
(async () => {
  await test('limiter allows max then answers 429 with Retry-After', async () => {
    const lim = rateLimit({ name: 't1', windowMs: 60000, max: 3 }); let ok = 0; let last;
    for (let i = 0; i < 5; i++) { const r = res(); lim({ ip: '1.1.1.1' }, r, () => ok++); last = r; }
    assert.strictEqual(ok, 3); assert.strictEqual(last.code, 429); assert(Number(last.headers['Retry-After']) > 0); assert.match(last.body.message, /wait/i);
  });
  await test('limiter counts addresses separately', async () => {
    const lim = rateLimit({ name: 't2', windowMs: 60000, max: 1 }); let ok = 0;
    lim({ ip: 'a' }, res(), () => ok++); lim({ ip: 'b' }, res(), () => ok++); assert.strictEqual(ok, 2);
  });
  await test('per-account key ignores case and spaces', async () => {
    assert.strictEqual(emailKey({ body: { email: '  A@X.com ' } }), 'a@x.com');
  });
  await test('sanitizer strips $operators, dotted and prototype keys', async () => {
    const req = { body: { email: { $ne: null }, ok: 'x', 'a.b': 1, nested: [{ $gt: 1, v: 2 }] }, query: { q: 'react', $where: '1' }, params: {} };
    sanitizeInput(req, res(), () => {});
    assert.deepStrictEqual(req.body, { email: {}, ok: 'x', nested: [{ v: 2 }] }); assert.deepStrictEqual({ ...req.query }, { q: 'react' });
  });
  await test('security headers set', async () => { const r = res(); securityHeaders({}, r, () => {}); assert.strictEqual(r.headers['X-Content-Type-Options'], 'nosniff'); assert.strictEqual(r.headers['X-Frame-Options'], 'DENY'); });

  // OTP cap
  let otpDeleted = 0;
  fakes['models/OTP'] = { findOne: () => ({ sort: () => ({ limit: async () => ({ otp: '111111' }) }) }), deleteMany: async () => { otpDeleted++; } };
  fakes['models/User'] = Object.assign(function User(d) { Object.assign(this, d); this.save = async () => {}; }, { findOne: (q) => ({ populate: async () => ({ _id: 'u', email: q.email, accountType: 'Student', password: 'h:secret123' }) }) });
  fakes['models/Profile'] = { create: async () => ({ _id: 'p' }) };
  const Auth = require(SRV + '/controllers/Auth');
  const signup = async (otp) => { const r = res(); await Auth.signUp({ body: { firstName: 'A', lastName: 'B', email: 'x@y.com', password: 'password1', confirmPassword: 'password1', otp } }, r); return r; };
  await test('wrong codes count down, then the code is thrown away', async () => {
    const msgs = []; for (let i = 0; i < 4; i++) { const r = await signup('000000'); assert.strictEqual(r.code, 403); msgs.push(r.body.message); }
    assert.match(msgs[0], /4 tries left/); assert.match(msgs[3], /1 try left/);
    const r5 = await signup('000000'); assert.strictEqual(r5.code, 429); assert.strictEqual(otpDeleted, 1);
  });
  await test('right code after a wrong one signs up and clears the count', async () => {
    await signup('000000'); const r = await signup('111111'); assert.strictEqual(r.code, 201); assert.strictEqual(Auth._otpFailures.size, 0);
  });
  await test('object passed as otp/email is rejected, not queried', async () => { const r = res(); await Auth.signUp({ body: { firstName: 'A', lastName: 'B', email: { $ne: null }, password: 'password1', confirmPassword: 'password1', otp: { $ne: null } } }, r); assert.strictEqual(r.code, 400); });
  await test('login issues a 7-day session', async () => { const r = res(); await Auth.login({ body: { email: 'x@y.com', password: 'secret123' } }, r); assert.strictEqual(r.code, 200); assert.strictEqual(signed.expiresIn, '7d'); });
  console.log(`\n${passed} passed`);
})();
