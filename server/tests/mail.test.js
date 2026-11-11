// Email sending: Brevo request, failure handling and the sign-up code endpoint.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const _l0 = Module._load; Module._load = function (req) { if (req === 'nodemailer') return { createTransport: () => ({ sendMail: async () => ({}) }) }; return _l0.apply(this, arguments); };
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, '\n  ', e.message); process.exitCode = 1; } };
(async () => {
  process.env.BREVO_API_KEY = 'xkeysib-test'; process.env.MAIL_FROM = 'sender@example.com';
  const mailSender = require(SRV + '/utils/mailSender');
  let lastReq;
  global.fetch = async (url, opts) => { lastReq = { url, opts: { ...opts, body: JSON.parse(opts.body) } }; return { ok: true, json: async () => ({ messageId: 'm1' }) }; };
  await test('Brevo: posts to API with sender, recipient, subject, html', async () => {
    const r = await mailSender('to@example.com', 'Hi', '<b>x</b>');
    assert(r && r.messageId === 'm1'); assert.strictEqual(lastReq.url, 'https://api.brevo.com/v3/smtp/email');
    assert.strictEqual(lastReq.opts.headers['api-key'], 'xkeysib-test'); assert.strictEqual(lastReq.opts.body.sender.email, 'sender@example.com');
    assert.strictEqual(lastReq.opts.body.to[0].email, 'to@example.com'); assert.strictEqual(lastReq.opts.body.htmlContent, '<b>x</b>');
  });
  global.fetch = async () => ({ ok: false, status: 400, text: async () => 'sender email is invalid' });
  await test('Brevo error -> null, no throw', async () => assert.strictEqual(await mailSender('a@b.c', 's', 'h'), null));
  global.fetch = (url, opts) => new Promise((_, rej) => opts.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e); }));
  await test('hung request gives up within ~10s, returns null', async () => { const t = Date.now(); assert.strictEqual(await mailSender('a@b.c', 's', 'h'), null); assert(Date.now() - t < 11500); });

  // sendOTP reports failure instead of pretending
  let mailImpl = async () => null;
  const fakes = { 'utils/mailSender': (...a) => mailImpl(...a) };
  const otps = []; let deleted = 0;
  fakes['models/OTP'] = { findOne: async () => null, create: async (o) => { const d = { _id: 'o' + otps.length, ...o }; otps.push(d); return d; }, deleteOne: async () => { deleted++; } };
  fakes['models/User'] = { findOne: async () => null };
  const real = Module._load;
  Module._load = function (req, parent) {
    if (req === 'bcrypt') return { hash: async () => 'h', compare: async () => true };
    if (req === 'otp-generator') return { generate: () => '123456' };
    if (req === 'dotenv') return { config() {} };
    if (req === 'jsonwebtoken') return {};
    const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
    if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; if (rel.startsWith('models/')) return {}; }
    return real.apply(this, arguments);
  };
  const Auth = require(SRV + '/controllers/Auth');
  const res = () => { const r = {}; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
  await test('sendOTP: email failure -> 503, code removed', async () => { const r = res(); await Auth.sendOTP({ body: { email: 'new@x.com' } }, r); assert.strictEqual(r.code, 503); assert.strictEqual(deleted, 1); assert(/couldn't send/i.test(r.body.message)); });
  mailImpl = async () => ({ ok: 1 });
  await test('sendOTP: email sent -> 201', async () => { const r = res(); await Auth.sendOTP({ body: { email: 'new2@x.com' } }, r); assert.strictEqual(r.code, 201); });
  console.log(`\n${passed} passed`);
})();
