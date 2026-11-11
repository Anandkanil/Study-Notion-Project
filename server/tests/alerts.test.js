// Error alerts: emailed on 5xx, throttled per route and per day, silent without ALERT_EMAIL.
const Module = require('module'); const path = require('path'); const assert = require('assert'); const { EventEmitter } = require('events');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const sent = []; const realLoad = Module._load;
Module._load = function (req, parent) {
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.replace(/\.js$/, '') === path.join(SRV, 'utils/mailSender')) return { inBackground: (to, subj, html) => sent.push({ to, subj, html }) };
  return realLoad.apply(this, arguments);
};
const { sendAlert, alertOnServerErrors } = require(SRV + '/utils/alerts');
let passed = 0; const test = async (n, fn) => { try { sendAlert._reset(); sent.length = 0; await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
const hit = (status, p = '/x') => { const res = new EventEmitter(); res.statusCode = status; alertOnServerErrors({ method: 'POST', baseUrl: '/api/v1/test', path: p }, res, () => {}); res.emit('finish'); };
(async () => {
  await test('no ALERT_EMAIL: nothing sent', async () => { delete process.env.ALERT_EMAIL; hit(500); assert.strictEqual(sent.length, 0); });
  process.env.ALERT_EMAIL = 'owner@example.com';
  await test('500 sends one alert with route and recent error log', async () => {
    console.error('Boom: database timeout'); hit(500);
    assert.strictEqual(sent.length, 1); assert.match(sent[0].subj, /Server error 500/); assert.match(sent[0].html, /POST \/api\/v1\/test\/x/); assert.match(sent[0].html, /database timeout/);
  });
  await test('4xx never alerts', async () => { hit(404); hit(429); assert.strictEqual(sent.length, 0); });
  await test('same route alerts once per 30 minutes', async () => { hit(500); hit(500); hit(502); assert.strictEqual(sent.length, 1); });
  await test('at most 10 alerts a day', async () => { for (let i = 0; i < 15; i++) hit(500, '/r' + i); assert.strictEqual(sent.length, 10); });
  await test('alert text is HTML-escaped', async () => { sendAlert({ title: 'x', route: '<script>', details: '<b>' }); assert(!/<script>/.test(sent[0].html)); });
  console.log(`\n${passed} passed`);
})();
