// In-app notifications: the helper never throws and dedupes, and users only touch their own notices.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {};
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Schema: function () { return { index() {} }; }, model: () => ({}), Types: { ObjectId: {} } };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; }
  return realLoad.apply(this, arguments);
};
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const chain = (v) => { const p = Promise.resolve(v); ['sort', 'limit', 'select'].forEach((k) => (p[k] = () => p)); p.lean = () => p; return p; };
const U = 'aaaaaaaaaaaaaaaaaaaaaaaa', N = 'bbbbbbbbbbbbbbbbbbbbbbbb';
(async () => {
  let inserted = null; let fail = false; let lastFilter = null;
  fakes['models/Notification'] = {
    insertMany: async (docs) => { if (fail) throw new Error('db down'); inserted = docs; },
    find: (f) => { lastFilter = f; return chain([{ title: 'Hi' }]); },
    countDocuments: async () => 2,
    updateOne: async (f) => { lastFilter = f; },
    updateMany: async (f) => { lastFilter = f; },
  };
  const notify = require(SRV + '/utils/notify');
  await test('one notice per user, even if listed twice', async () => {
    const n = await notify([U, U, 'cccccccccccccccccccccccc'], { type: 'announcement', title: 'New lesson' });
    assert.strictEqual(n, 2); assert.strictEqual(inserted.length, 2);
  });
  await test('long text is trimmed to fit', async () => {
    await notify(U, { type: 'answer', title: 'x'.repeat(500), body: 'y'.repeat(900) });
    assert.strictEqual(inserted[0].title.length, 160); assert.strictEqual(inserted[0].body.length, 300);
  });
  await test('a database error never throws', async () => { fail = true; assert.strictEqual(await notify(U, { type: 'x', title: 'y' }), 0); fail = false; });
  await test('nothing is sent without a title or recipients', async () => {
    inserted = null; await notify([], { type: 'x', title: 'y' }); await notify(U, { type: 'x' }); assert.strictEqual(inserted, null);
  });
  const C = require(SRV + '/controllers/Notifications');
  await test('list returns my notices and unread count', async () => {
    const r = res(); await C.list({ user: { userId: U } }, r);
    assert.strictEqual(r.body.data.unread, 2); assert.strictEqual(String(lastFilter.user), U);
  });
  await test('marking read is limited to my own notice', async () => {
    const r = res(); await C.markRead({ params: { id: N }, user: { userId: U } }, r);
    assert.deepStrictEqual(lastFilter, { _id: N, user: U });
  });
  await test('invalid id is rejected', async () => { const r = res(); await C.markRead({ params: { id: 'nope' }, user: { userId: U } }, r); assert.strictEqual(r.code, 400); });
  console.log(`\n${passed} passed`);
})();
