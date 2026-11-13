// Weekly learning reminder: Sunday window, who gets it, once a week, daily cap, and unsubscribe.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, '\n  ', e.stack); process.exitCode = 1; } };

const day = (d) => d.toISOString().slice(0, 10);
// Sunday 15 Nov 2026, 11:00 India time = 05:30 UTC
const SUNDAY = new Date('2026-11-15T05:30:00Z');
const recent = [{ day: day(new Date(SUNDAY - 2 * 864e5)), lessons: 2 }, { day: day(new Date(SUNDAY - 3 * 864e5)), lessons: 1 }];
const old = [{ day: '2026-09-01', lessons: 3 }];
let users;
const reset = () => {
  users = [
    { _id: '64b0000000000000000000a1', firstName: 'Priya', email: 'priya@gmail.com', accountType: 'Student', learningDays: recent, weeklyGoal: 3 },
    { _id: '64b0000000000000000000a2', firstName: 'Off', email: 'off@gmail.com', accountType: 'Student', learningDays: recent, emailPrefs: { weeklyDigest: false } },
    { _id: '64b0000000000000000000a3', firstName: 'Old', email: 'old@gmail.com', accountType: 'Student', learningDays: old },
    { _id: '64b0000000000000000000a4', firstName: 'Demo', email: 'x@demo.studynotion.test', accountType: 'Student', learningDays: recent },
    { _id: '64b0000000000000000000a5', firstName: 'Teach', email: 't@gmail.com', accountType: 'Instructor', learningDays: recent },
    { _id: '64b0000000000000000000a6', firstName: 'Sus', email: 's@gmail.com', accountType: 'Student', learningDays: recent, suspended: true },
  ];
};
// Minimal query matching for the filter the digest uses
const match = (u, f) => Object.entries(f).every(([k, c]) => {
  const v = k.split('.').reduce((o, p) => o?.[p], u);
  if (c instanceof RegExp) return c.test(v);
  if (c && typeof c === 'object') {
    if ('$ne' in c) return v !== c.$ne;
    if ('$not' in c) return !c.$not.test(v);
    if ('$elemMatch' in c) return (v || []).some((d) => d.day >= c.$elemMatch.day.$gte && d.lessons > c.$elemMatch.lessons.$gt);
  }
  return String(v) === String(c);
});
const mails = [];
const fakes = {
  'models/User': {
    countDocuments: async (f) => users.filter((u) => match(u, f)).length,
    find: (f) => ({ select: () => ({ limit: (n) => ({ lean: async () => users.filter((u) => match(u, f)).slice(0, n).map((u) => ({ _id: u._id })) }) }) }),
    findOneAndUpdate: (f, upd) => ({ lean: async () => { const u = users.find((x) => match(x, f)); if (!u) return null; Object.assign(u, upd.$set); return { ...u }; } }),
    updateOne: async (f, upd) => { const u = users.find((x) => x._id === String(f._id)); if (u) { u.emailPrefs = { ...(u.emailPrefs || {}), weeklyDigest: upd.$set['emailPrefs.weeklyDigest'] }; } },
  },
  'models/Course': { findById: () => ({ select: () => ({ lean: async () => null }) }) },
  'utils/mailSender': async (to, subject, html) => { mails.push({ to, subject, html }); return { ok: true }; },
};
const real = Module._load;
Module._load = function (req, parent) {
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; }
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: (v) => /^[a-f0-9]{24}$/.test(v) } } };
  return real.apply(this, arguments);
};

(async () => {
  process.env.JWT_SECRET = 'secret';
  const D = require(SRV + '/utils/weeklyDigest');
  const P = require(SRV + '/controllers/EmailPrefs');
  const quiet = () => {};

  await test('only Sundays 10 am-8 pm India time', async () => {
    assert(D.inWindow(SUNDAY));
    assert(!D.inWindow(new Date('2026-11-15T03:00:00Z')), 'Sunday 8:30 am');
    assert(!D.inWindow(new Date('2026-11-15T15:00:00Z')), 'Sunday 8:30 pm');
    assert(!D.inWindow(new Date('2026-11-14T05:30:00Z')), 'Saturday');
    reset(); mails.length = 0; const r = await D.runWeeklyDigest(new Date('2026-11-14T05:30:00Z'), quiet);
    assert.strictEqual(r.sent, 0); assert.strictEqual(mails.length, 0);
  });
  await test('sends only to recently active students who kept it on (not demo, suspended, instructors)', async () => {
    reset(); mails.length = 0;
    const r = await D.runWeeklyDigest(SUNDAY, quiet);
    assert.strictEqual(r.sent, 1); assert.deepStrictEqual(mails.map((m) => m.to), ['priya@gmail.com']);
    assert(/3 of 3|weekly goal|lessons this week/i.test(mails[0].html)); assert(mails[0].html.includes('/digest/unsubscribe?u=64b0000000000000000000a1&amp;t='));
  });
  await test('once a week: a second run the same Sunday sends nothing', async () => {
    mails.length = 0; const r = await D.runWeeklyDigest(new Date(SUNDAY.getTime() + 3600e3), quiet);
    assert.strictEqual(r.sent, 0); assert.strictEqual(mails.length, 0);
  });
  await test('next Sunday it goes again', async () => {
    users[0].learningDays = [{ day: '2026-11-20', lessons: 1 }];
    mails.length = 0; const r = await D.runWeeklyDigest(new Date(SUNDAY.getTime() + 7 * 864e5), quiet);
    assert.strictEqual(r.sent, 1);
  });

  const res = () => { const r = { headers: {} }; r.status = (c) => (r.code = c, r); r.set = (k, v) => (r.headers[k] = v, r); r.send = (b) => (r.body = b, r); r.json = (b) => (r.body = b, r); return r; };
  await test('unsubscribe link: valid token turns it off; tampered token or id refused', async () => {
    reset();
    const id = users[0]._id;
    let r = res(); await P.unsubscribe({ query: { u: id, t: 'wrong' } }, r); assert.strictEqual(r.code, 400);
    r = res(); await P.unsubscribe({ query: { u: users[1]._id, t: D.unsubscribeToken(id) } }, r); assert.strictEqual(r.code, 400, "another person's token");
    r = res(); await P.unsubscribe({ query: { u: id, t: D.unsubscribeToken(id) } }, r);
    assert.strictEqual(r.code, 200); assert(/won't get weekly reminders/.test(r.body)); assert.strictEqual(users[0].emailPrefs.weeklyDigest, false);
    mails.length = 0; await D.runWeeklyDigest(SUNDAY, quiet); assert.strictEqual(mails.length, 0);
  });
  await test('settings: on/off saved; anything else refused', async () => {
    reset();
    let r = res(); await P.update({ body: { weeklyDigest: 'yes' }, user: { userId: users[0]._id } }, r); assert.strictEqual(r.code, 400);
    r = res(); await P.update({ body: { weeklyDigest: false }, user: { userId: users[0]._id } }, r); assert.strictEqual(r.code, 200); assert.strictEqual(users[0].emailPrefs.weeklyDigest, false);
  });
  console.log(`${passed} passed`);
})();
