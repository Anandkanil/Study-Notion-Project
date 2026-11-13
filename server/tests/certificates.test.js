// Certificates: issued only when every lesson is done, once per learner and course, and verifiable by code.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, '\n  ', e.stack); process.exitCode = 1; } };
const res = () => { const r = {}; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const lean = (v) => ({ lean: async () => v });

const C1 = '64b000000000000000000001';
const certs = [];
let progress = { completedVideos: ['l1'] };
const course = { _id: C1, courseName: 'SQL for Data Analysts', instructor: { firstName: 'Farah', lastName: 'Siddiqui' }, courseContent: [{ subSection: [{ _id: 'l1', timeDuration: '600' }, { _id: 'l2', timeDuration: '900' }] }] };
const q = (v) => { const o = { select: () => o, populate: () => o, lean: async () => v }; return o; };
const fakes = {
  'models/Certificate': {
    findOne: (f) => lean(certs.find((c) => (f.code ? c.code === f.code : String(c.user) === String(f.user) && String(c.course) === String(f.course))) || null),
    create: async (d) => { if (certs.some((c) => c.code === d.code)) { const e = new Error('dup'); e.code = 11000; throw e; } const c = { ...d, issuedAt: new Date('2026-11-13') }; certs.push(c); return c; },
  },
  'models/Course': { findById: () => q(course) },
  'models/CourseProgress': { findOne: () => lean(progress) },
  'models/User': { findById: () => q({ firstName: 'Priya', lastName: 'Nair' }) },
};
const real = Module._load;
Module._load = function (req, parent) {
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; }
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: (v) => /^[a-f0-9]{24}$/.test(v) } } };
  return real.apply(this, arguments);
};

(async () => {
  const C = require(SRV + '/controllers/Certificates');
  const me = (courseId = C1) => ({ params: { courseId }, user: { userId: 'u1' } });

  await test('codes are SN-XXXX-XXXX without look-alike characters', async () => {
    for (let i = 0; i < 200; i++) { const c = C._test.newCode(); assert(C._test.CODE_RE.test(c), c); assert(!/[01OI]/.test(c.slice(3))); }
  });
  await test('unfinished course: no certificate, progress shown', async () => {
    const r = res(); await C.mine(me(), r); assert.strictEqual(r.code, 200); assert.strictEqual(r.body.data, null); assert.strictEqual(r.body.progress, 50); assert.strictEqual(certs.length, 0);
  });
  await test('invalid course id -> 400; not enrolled -> 404', async () => {
    let r = res(); await C.mine(me('x'), r); assert.strictEqual(r.code, 400);
    const saved = progress; progress = null; r = res(); await C.mine(me(), r); assert.strictEqual(r.code, 404); progress = saved;
  });
  let code;
  await test('finished course: issued once with names, lessons and duration', async () => {
    progress = { completedVideos: ['l1', 'l2'] };
    const r = res(); await C.mine(me(), r);
    const d = r.body.data; code = d.code;
    assert.deepStrictEqual([d.learnerName, d.courseName, d.instructorName, d.lessons, d.totalDuration], ['Priya Nair', 'SQL for Data Analysts', 'Farah Siddiqui', 2, '25m']);
    const r2 = res(); await C.mine(me(), r2); assert.strictEqual(r2.body.data.code, code); assert.strictEqual(certs.length, 1);
  });
  await test('verify: real code (any case) -> details; unknown or malformed -> 404', async () => {
    let r = res(); await C.verify({ params: { code: code.toLowerCase() } }, r); assert.strictEqual(r.code, 200); assert.strictEqual(r.body.data.learnerName, 'Priya Nair');
    assert.strictEqual(r.body.data.user, undefined, 'no user id in the public view');
    r = res(); await C.verify({ params: { code: 'SN-2222-2222' } }, r); assert.strictEqual(r.code, 404);
    r = res(); await C.verify({ params: { code: '{"$ne":null}' } }, r); assert.strictEqual(r.code, 404);
  });
  console.log(`${passed} passed`);
})();
