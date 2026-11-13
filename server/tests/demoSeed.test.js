// Demo catalogue seed: adds everything once, is safe to repeat, and removes only demo data.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, '\n  ', e.stack); process.exitCode = 1; } };

// ---- a tiny in-memory stand-in for the Mongoose models the seed uses ----
let nextId = 1;
const oid = () => `id${nextId++}`;
const same = (a, b) => String(a) === String(b);
const get = (doc, k) => k.split('.').reduce((o, p) => (o == null ? o : o[p]), doc);
function matches(doc, q) {
  return Object.entries(q || {}).every(([k, cond]) => {
    if (k === '$or') return cond.some((c) => matches(doc, c));
    const v = get(doc, k);
    if (cond instanceof RegExp) return cond.test(v || '');
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('$in' in cond) return Array.isArray(v) ? v.some((x) => cond.$in.some((y) => same(x, y))) : cond.$in.some((y) => same(v, y));
      if ('$size' in cond) return (v || []).length === cond.$size;
      if ('$ne' in cond) return !same(v, cond.$ne);
    }
    return Array.isArray(v) ? v.some((x) => same(x, cond)) : same(v, cond);
  });
}
function applyUpdate(doc, u) {
  for (const [k, v] of Object.entries(u.$addToSet || {})) { doc[k] = doc[k] || []; if (!doc[k].some((x) => same(x, v))) doc[k].push(v); }
  for (const [k, v] of Object.entries(u.$pull || {})) { if (!doc[k]) continue; doc[k] = doc[k].filter((x) => (v && v.$in ? !v.$in.some((y) => same(x, y)) : !same(x, v))); }
}
const chain = (val) => { const p = Promise.resolve(val); p.select = () => p; p.lean = () => p; p.populate = () => p; return p; };
function model(name) {
  const rows = [];
  const unique = { User: 'email', Category: 'name', Path: 'slug' }[name];
  const clone = (d) => JSON.parse(JSON.stringify(d));
  return {
    rows,
    async create(d) {
      if (unique && rows.some((r) => r[unique] === d[unique])) throw new Error(`duplicate ${name}.${unique}`);
      const doc = { _id: oid(), ...clone(d) }; rows.push(doc); return doc;
    },
    async insertMany(list) { return Promise.all(list.map((d) => this.create(d))); },
    findOne(q) { return chain(rows.find((r) => matches(r, q)) || null); },
    find(q) { return chain(rows.filter((r) => matches(r, q))); },
    async updateOne(q, u) { const d = rows.find((r) => matches(r, q)); if (d) applyUpdate(d, u); },
    async updateMany(q, u) { rows.filter((r) => matches(r, q)).forEach((d) => applyUpdate(d, u)); },
    async deleteMany(q) { const keep = rows.filter((r) => !matches(r, q)); const n = rows.length - keep.length; rows.splice(0, rows.length, ...keep); return { deletedCount: n }; },
  };
}
const M = {};
for (const n of ['User', 'Profile', 'Category', 'Course', 'Section', 'SubSection', 'CourseProgress', 'Path']) M[n] = model(n);
const real = Module._load;
Module._load = function (req, parent) {
  if (req === 'bcrypt') return { hash: async () => 'hashed' };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (rel.startsWith('models/')) return M[rel.slice(7)]; }
  return real.apply(this, arguments);
};

(async () => {
  const catalog = require(SRV + '/seed/demoCatalog');
  const { seedDemo, removeDemo } = require(SRV + '/seed/demo');
  const quiet = () => {};

  // What already exists in the live database: the original 5 categories, a real instructor, student and course
  for (const name of ['Web Development', 'Machine Learning', 'Cloud Computing', 'UI UX', 'Cybersecurity']) await M.Category.create({ name, courses: [] });
  const realInstructor = await M.User.create({ firstName: 'Vikram', lastName: 'S', email: 'vikram@gmail.com', accountType: 'Instructor', courses: [] });
  const realStudent = await M.User.create({ firstName: 'Real', lastName: 'Student', email: 'student@gmail.com', accountType: 'Student', courses: [] });
  const realCourse = await M.Course.create({ courseName: 'MERN Stack', instructor: realInstructor._id, studentsEnrolled: [realStudent._id], courseContent: [] });
  await M.Category.updateOne({ name: 'Web Development' }, { $addToSet: { courses: realCourse._id } });

  let first;
  await test('catalogue is consistent: every course has a known category, instructor and track entry', async () => {
    const cats = new Set(['Web Development', 'Machine Learning', 'Cloud Computing', 'UI UX', 'Cybersecurity', ...catalog.categories.map((c) => c.name)]);
    const names = new Set(catalog.courses.map((c) => c.name));
    assert.strictEqual(names.size, catalog.courses.length, 'duplicate course names');
    for (const c of catalog.courses) {
      assert(cats.has(c.cat), c.name); assert(catalog.instructors.some((i) => i.key === c.by), c.name);
      assert(c.desc.length <= 1000 && c.price > 0 && c.learn.length >= 3 && c.sections.length >= 2, c.name);
      for (const [, lessons] of c.sections) for (const l of lessons) assert(/^[^|]+\|\d+$/.test(l), l);
    }
    for (const t of [...catalog.tracks.flat(), ...catalog.paths.flatMap((p) => p.courses)]) assert(names.has(t), t);
    for (const c of catalog.categories) assert(c.description.length <= 300, c.name);
  });

  await test('add: creates instructors, categories, published courses, students and paths', async () => {
    first = await seedDemo(quiet);
    assert.deepStrictEqual([first.instructors, first.categories, first.courses, first.students, first.paths],
      [catalog.instructors.length, catalog.categories.length, catalog.courses.length, catalog.studentNames.length, catalog.paths.length]);
    assert(first.enrolments >= catalog.studentNames.length);
    const demoCourses = M.Course.rows.filter((c) => c.courseName !== 'MERN Stack');
    assert(demoCourses.every((c) => c.status === 'Published' && c.thumbnail.endsWith('.jpg') && c.courseContent.length && c.category));
  });

  await test('every demo account uses the reserved .test domain and an unusable password', async () => {
    const demo = M.User.rows.filter((u) => !/@gmail\.com$/.test(u.email));
    assert.strictEqual(demo.length, catalog.instructors.length + catalog.studentNames.length);
    assert(demo.every((u) => u.email.endsWith('@demo.studynotion.test') && u.password === 'hashed' && u.additionalDetails));
  });

  await test('links are consistent: category, instructor, enrolment and progress', async () => {
    for (const c of M.Course.rows.filter((x) => x.courseName !== 'MERN Stack')) {
      const cat = M.Category.rows.find((k) => same(k._id, c.category));
      assert(cat.courses.some((x) => same(x, c._id)), `category of ${c.courseName}`);
      const teacher = M.User.rows.find((u) => same(u._id, c.instructor));
      assert(teacher.accountType === 'Instructor' && teacher.courses.some((x) => same(x, c._id)));
      for (const sid of c.studentsEnrolled) {
        const s = M.User.rows.find((u) => same(u._id, sid));
        assert(s.accountType === 'Student' && s.courses.some((x) => same(x, c._id)));
        const p = M.CourseProgress.rows.find((r) => same(r.courseID, c._id) && same(r.userId, sid));
        const lessonIds = M.Section.rows.filter((sec) => c.courseContent.some((x) => same(x, sec._id))).flatMap((sec) => sec.subSection);
        assert(p && p.completedVideos.every((v) => lessonIds.some((l) => same(l, v))), 'progress only counts lessons of that course');
      }
    }
    const lesson = M.SubSection.rows[0];
    assert(Number(lesson.timeDuration) >= 8 * 60 && lesson.videoUrl.endsWith('.mp4'));
  });

  await test('repeat run adds nothing new', async () => {
    const before = { users: M.User.rows.length, courses: M.Course.rows.length, progress: M.CourseProgress.rows.length };
    const again = await seedDemo(quiet);
    assert.deepStrictEqual(again, { instructors: 0, categories: 0, courses: 0, students: 0, enrolments: 0, paths: 0 });
    assert.deepStrictEqual({ users: M.User.rows.length, courses: M.Course.rows.length, progress: M.CourseProgress.rows.length }, before);
  });

  await test('remove: deletes only demo data; real users, course and categories stay', async () => {
    // a real student who enrolled in a demo course keeps their account
    const demoCourse = M.Course.rows.find((c) => c.courseName === 'SQL for Data Analysts');
    await M.User.updateOne({ _id: realStudent._id }, { $addToSet: { courses: demoCourse._id } });
    const r = await removeDemo(quiet);
    assert.strictEqual(r.courses, catalog.courses.length); assert.strictEqual(r.categories, catalog.categories.length);
    assert.deepStrictEqual(M.User.rows.map((u) => u.email).sort(), ['student@gmail.com', 'vikram@gmail.com']);
    assert.deepStrictEqual(M.Course.rows.map((c) => c.courseName), ['MERN Stack']);
    assert.strictEqual(M.Category.rows.length, 5);
    assert.deepStrictEqual(M.Category.rows.find((c) => c.name === 'Web Development').courses, [realCourse._id]);
    assert.deepStrictEqual(M.User.rows.find((u) => u.email === 'student@gmail.com').courses, []);
    assert.strictEqual(M.Path.rows.length + M.Section.rows.length + M.SubSection.rows.length + M.CourseProgress.rows.length + M.Profile.rows.length, 0);
  });

  console.log(`${passed} passed`);
})();
