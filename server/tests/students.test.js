// Student features: streak maths, lesson progress rules, completion email, wishlist and free preview.
const Module = require('module'); const path = require('path'); const assert = require('assert');
const SRV = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const realLoad = Module._load; const fakes = {}; const mails = [];
Module._load = function (req, parent) {
  if (req === 'mongoose') return { Types: { ObjectId: { isValid: (v) => /^[a-f0-9]{24}$/.test(v) } } };
  if (req === 'dotenv') return { config() {} };
  const abs = parent && req.startsWith('.') ? path.resolve(path.dirname(parent.filename), req) : null;
  if (abs && abs.startsWith(SRV)) { const rel = path.relative(SRV, abs).replace(/\.js$/, ''); if (fakes[rel]) return fakes[rel]; if (rel.startsWith('models/') || rel.startsWith('config/')) return fakes[rel] = {}; }
  return realLoad.apply(this, arguments);
};
fakes['utils/imageUploader'] = { uploadImageToCloudinary: async () => ({}) };
fakes['utils/mailSender'] = Object.assign(async () => ({}), { inBackground: (to, subject) => mails.push({ to, subject }) });
const { recordLesson, summarize, dayKey } = require(SRV + '/utils/learningDays');
let passed = 0; const test = async (n, fn) => { try { await fn(); passed++; console.log('PASS', n); } catch (e) { console.log('FAIL', n, e.message); process.exitCode = 1; } };
const res = () => { const r = { code: 200 }; r.status = (c) => (r.code = c, r); r.json = (b) => (r.body = b, r); return r; };
const q = (v) => { const p = Promise.resolve(v); ['select', 'populate', 'sort'].forEach((k) => (p[k] = () => p)); p.lean = () => p; return p; };
const C = 'cccccccccccccccccccccccc', L1 = 'aaaaaaaaaaaaaaaaaaaaaaa1', L2 = 'aaaaaaaaaaaaaaaaaaaaaaa2', OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbb';
(async () => {
  // Streaks (India time: 2026-11-13 02:00 IST = 2026-11-12 20:30 UTC)
  const at = (iso) => new Date(iso);
  await test('day key uses India time', async () => assert.strictEqual(dayKey(at('2026-11-12T20:30:00Z')), '2026-11-13'));
  await test('streak counts back from today, or yesterday if nothing yet today', async () => {
    const days = [{ day: '2026-11-10', lessons: 1 }, { day: '2026-11-11', lessons: 2 }, { day: '2026-11-12', lessons: 1 }];
    assert.strictEqual(summarize(days, 3, at('2026-11-12T10:00:00Z')).currentStreak, 3);
    assert.strictEqual(summarize(days, 3, at('2026-11-13T10:00:00Z')).currentStreak, 3); // today not done yet
    assert.strictEqual(summarize(days, 3, at('2026-11-14T10:00:00Z')).currentStreak, 0); // a missed day breaks it
  });
  await test('week total runs Monday to today', async () => {
    const days = [{ day: '2026-11-08', lessons: 5 }, { day: '2026-11-09', lessons: 2 }, { day: '2026-11-12', lessons: 1 }];
    const s = summarize(days, 3, at('2026-11-12T10:00:00Z')); // Thursday
    assert.strictEqual(s.thisWeek, 3); assert.strictEqual(s.last14.length, 14); assert.strictEqual(s.bestStreak, 2);
  });
  await test('recordLesson adds to today and drops days older than 120', async () => {
    const out = recordLesson([{ day: '2026-01-01', lessons: 1 }, { day: '2026-11-12', lessons: 1 }], at('2026-11-12T10:00:00Z'));
    assert.deepStrictEqual(out, [{ day: '2026-11-12', lessons: 2 }]);
  });

  // Lesson progress
  const progress = { completedVideos: [L1], save: async () => {} };
  let savedDays = null;
  fakes['models/Course'] = { findById: () => q({ courseName: 'React', courseContent: [{ subSection: [L1, L2] }] }) };
  fakes['models/CourseProgress'] = { findOne: async () => progress };
  fakes['models/User'] = { findById: () => ({ select: async () => ({ email: 's@x.com', firstName: 'S', learningDays: [], save: async function () { savedDays = this.learningDays; } }) }) };
  const { updateCourseProgress } = require(SRV + '/controllers/CourseProgress');
  const mark = async (sub) => { const r = res(); await updateCourseProgress({ body: { courseId: C, subsectionId: sub }, user: { userId: 'u' } }, r); return r; };
  await test('a lesson from another course is refused', async () => assert.strictEqual((await mark(OTHER)).code, 400));
  await test('finishing the last lesson completes the course, logs the day and emails once', async () => {
    const r = await mark(L2); assert.strictEqual(r.body.completedCourse, true); assert.strictEqual(savedDays[0].lessons, 1);
    assert.strictEqual(mails.length, 1); assert.match(mails[0].subject, /finished React/);
    assert.strictEqual(r.body.streak.firstToday, true); assert.strictEqual(r.body.streak.currentStreak, 1);
  });
  await test('streak update: first lesson of the day, new best and weekly goal', async () => {
    const { _streakUpdate } = require(SRV + '/controllers/CourseProgress');
    const now = at('2026-11-12T10:00:00Z'); // Thursday
    const days = [{ day: '2026-11-10', lessons: 1 }, { day: '2026-11-11', lessons: 1 }];
    const u = _streakUpdate(summarize(days, 3, now), summarize(recordLesson(days, now), 3, now));
    assert.deepStrictEqual([u.firstToday, u.currentStreak, u.newBest, u.goalReached], [true, 3, true, true]);
    const again = recordLesson(days, now);
    const v = _streakUpdate(summarize(again, 3, now), summarize(recordLesson(again, now), 3, now));
    assert.deepStrictEqual([v.firstToday, v.newBest, v.goalReached], [false, false, false]);
  });
  await test('marking a done lesson again is harmless and sends nothing', async () => { const r = await mark(L2); assert.strictEqual(r.code, 200); assert.strictEqual(mails.length, 1); });

  // Wishlist + preview
  let wishlist = [];
  fakes['models/User'].findByIdAndUpdate = (id, u) => { if (u.$addToSet) wishlist = [...new Set([...wishlist, u.$addToSet.wishlist])]; if (u.$pull) wishlist = wishlist.filter((x) => x !== u.$pull.wishlist); return q({ wishlist }); };
  let courseDoc = { _id: C, studentsEnrolled: [] };
  fakes['models/Course'].findOne = () => q(courseDoc);
  const P = require(SRV + '/controllers/Profile');
  await test('wishlist add and remove', async () => {
    let r = res(); await P.addToWishlist({ body: { courseId: C }, user: { userId: 'u' } }, r); assert.deepStrictEqual(r.body.data, [C]);
    r = res(); await P.removeFromWishlist({ params: { courseId: C }, user: { userId: 'u' } }, r); assert.deepStrictEqual(r.body.data, []);
  });
  await test('cannot wishlist a course you already own', async () => { courseDoc = { _id: C, studentsEnrolled: ['u'] }; const r = res(); await P.addToWishlist({ body: { courseId: C }, user: { userId: 'u' } }, r); assert.strictEqual(r.code, 409); });
  await test('weekly goal must be 1 to 50', async () => { const r = res(); await P.setWeeklyGoal({ body: { goal: 0 }, user: { userId: 'u' } }, r); assert.strictEqual(r.code, 400); });

  courseDoc = { courseName: 'React', courseContent: [{ sectionName: 'Intro', subSection: [] }, { sectionName: 'Basics', subSection: [{ _id: L1, title: 'Hello', videoUrl: 'https://v/1.mp4' }] }] };
  // Saved lessons
  const S1 = 'dddddddddddddddddddddddd';
  let savedDoc = { savedLessons: [], save: async () => {} };
  const saveFind = fakes['models/User'].findById;
  await test('saving a lesson needs enrolment and a lesson from that course', async () => {
    fakes['models/Course'].findById = () => q({ studentsEnrolled: ['someone-else'], courseContent: [{ _id: S1, subSection: [L1] }] });
    let r = res(); await P.saveLesson({ body: { courseId: C, sectionId: S1, subSectionId: L1 }, user: { userId: 'u' } }, r); assert.strictEqual(r.code, 403);
    fakes['models/Course'].findById = () => q({ studentsEnrolled: ['u'], courseContent: [{ _id: S1, subSection: [L1] }] });
    r = res(); await P.saveLesson({ body: { courseId: C, sectionId: S1, subSectionId: L2 }, user: { userId: 'u' } }, r); assert.strictEqual(r.code, 400);
  });
  await test('saving the same lesson twice keeps one entry, newest first', async () => {
    fakes['models/User'].findById = (id) => ({ select: (f) => (f === 'savedLessons' ? Object.assign(Promise.resolve(savedDoc), { populate: () => ({ populate: () => ({ lean: async () => ({ savedLessons: [] }) }) }) }) : saveFind(id).select(f)) });
    for (let i = 0; i < 2; i++) { const r = res(); await P.saveLesson({ body: { courseId: C, sectionId: S1, subSectionId: L1 }, user: { userId: 'u' } }, r); assert.strictEqual(r.code, 200); }
    assert.strictEqual(savedDoc.savedLessons.length, 1); assert.strictEqual(String(savedDoc.savedLessons[0].subSection), L1);
    fakes['models/User'].findById = saveFind;
  });
  await test('last lesson is only remembered for an enrolled course', async () => {
    let updated = null;
    fakes['models/User'].exists = async () => null;
    fakes['models/User'].updateOne = async (_q, u) => { updated = u; };
    let r = res(); await P.setLastLesson({ body: { courseId: C, sectionId: S1, subSectionId: L1 }, user: { userId: 'u' } }, r); assert.strictEqual(r.code, 403); assert.strictEqual(updated, null);
    fakes['models/User'].exists = async () => ({ _id: 'u' });
    r = res(); await P.setLastLesson({ body: { courseId: C, sectionId: S1, subSectionId: L1 }, user: { userId: 'u' } }, r); assert.strictEqual(r.code, 200); assert.strictEqual(String(updated.lastLesson.subSection), L1);
  });
  await test('stats include the history for the calendar', async () => {
    const s = summarize([{ day: '2026-11-01', lessons: 2 }, { day: '2026-11-03', lessons: 0 }], 3, new Date('2026-11-12T10:00:00Z'));
    assert.deepStrictEqual(s.history, [{ day: '2026-11-01', lessons: 2 }]); assert.strictEqual(s.today, '2026-11-12');
  });
  const { getCoursePreview } = require(SRV + '/controllers/Courses');
  await test('preview returns the first lesson that exists', async () => { const r = res(); await getCoursePreview({ params: { courseId: C } }, r); assert.strictEqual(r.body.data.title, 'Hello'); assert.strictEqual(r.body.data.sectionName, 'Basics'); });
  await test('preview of a missing or unpublished course is 404', async () => { courseDoc = null; const r = res(); await getCoursePreview({ params: { courseId: C } }, r); assert.strictEqual(r.code, 404); });
  console.log(`\n${passed} passed`);
})();
