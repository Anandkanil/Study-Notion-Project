// Guided paths: admin rules (published courses only, 2+ to publish), order kept, drafts hidden.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {};
Module._load = function (req, parent) {
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; }
  return realLoad.apply(this, arguments);
};
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const chain = (v) => { const p = Promise.resolve(v); ['select', 'sort', 'populate'].forEach((k) => (p[k] = () => p)); p.lean = () => p; return p; };
const A = 'aaaaaaaaaaaaaaaaaaaaaaaa', B = 'bbbbbbbbbbbbbbbbbbbbbbbb', D = 'dddddddddddddddddddddddd';
(async () => {
  let publishedCount = 2; let clash = null; let created = null; let paths = [];
  const courses = [
    { _id: B, courseName: 'Second', price: 300, courseContent: [{ subSection: [1, 2] }], instructor: { firstName: 'R', lastName: 'K' }, category: { name: 'Web' } },
    { _id: A, courseName: 'First', price: 200, courseContent: [{ subSection: [1] }] },
  ];
  fakes['utils/adminLog'] = async () => {};
  fakes['models/Course'] = { countDocuments: async () => publishedCount, find: () => chain(courses) };
  fakes['models/Path'] = {
    findOne: (q) => chain(q.slug && q.published === undefined ? clash : paths.find((p) => p.slug === q.slug && p.published) || null),
    create: async (v) => (created = { _id: D, ...v }),
    find: (q) => chain(paths.filter((p) => !q.published || p.published)),
  };
  const P = require(SRV + '/controllers/Paths');
  const body = { title: 'Full-stack developer', summary: 'From the basics to deploying real apps.', courses: [A, B] };

  await test('slugs are clean', async () => assert.strictEqual(P._slugify('Full-Stack  Developer!!'), 'full-stack-developer'));
  await test('a path can only use published courses', async () => {
    publishedCount = 1; const r = res(); await P.create({ body, user: { userId: 'x' } }, r); assert.strictEqual(r.code, 400); publishedCount = 2;
  });
  await test('publishing needs at least 2 courses', async () => {
    const r = res(); await P.create({ body: { ...body, courses: [A], published: true }, user: { userId: 'x' } }, r); assert.strictEqual(r.code, 400);
  });
  await test('a valid path is created as a draft by default', async () => {
    const r = res(); await P.create({ body, user: { userId: 'x' } }, r);
    assert.strictEqual(r.code, 201); assert.strictEqual(created.published, false); assert.strictEqual(created.slug, 'full-stack-developer'); assert.deepStrictEqual(created.courses, [A, B]);
  });
  await test('a slug clash gets a suffix', async () => {
    clash = { _id: 'other' }; const r = res(); await P.create({ body, user: { userId: 'x' } }, r); assert.match(created.slug, /^full-stack-developer-/); clash = null;
  });
  await test('public list keeps the admin order and hides drafts', async () => {
    paths = [{ _id: D, title: 'Live', slug: 'live', published: true, courses: [A, B] }, { _id: 'z', title: 'Draft', slug: 'draft', published: false, courses: [A, B] }];
    const r = res(); await P.listPublic({}, r);
    assert.strictEqual(r.body.data.length, 1); assert.deepStrictEqual(r.body.data[0].courses.map((c) => c.courseName), ['First', 'Second']);
    assert.strictEqual(r.body.data[0].totalPrice, 500); assert.strictEqual(r.body.data[0].totalLessons, 3);
  });
  await test('a draft path is not found publicly', async () => { const r = res(); await P.getPublic({ params: { slug: 'draft' } }, r); assert.strictEqual(r.code, 404); });
  console.log(`\n${passed} passed`);
})();
