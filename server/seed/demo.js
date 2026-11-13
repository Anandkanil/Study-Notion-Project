/*
 * Adds (or removes) the demo catalogue in seed/demoCatalog.js.
 *
 * Runs on server start when SEED_DEMO is set:
 *   SEED_DEMO=add     add anything missing (safe to repeat: existing items are left alone)
 *   SEED_DEMO=remove  delete every demo account, demo course and demo path
 * Unset the variable afterwards.
 *
 * Only demo data is touched: demo accounts are found by their .test email domain,
 * demo courses by their demo instructor, paths by slug.
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Category = require('../models/Category');
const Course = require('../models/Course');
const Section = require('../models/Section');
const SubSection = require('../models/SubSection');
const CourseProgress = require('../models/CourseProgress');
const Path = require('../models/Path');
const catalog = require('./demoCatalog');

const ASSET_BASE = (process.env.DEMO_ASSET_BASE || 'https://studynotion-project-1.netlify.app/demo').replace(/\/$/, '');
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const emailFor = (first, last) => `${slugify(first)}.${slugify(last)}@${catalog.DOMAIN}`;
const avatar = (first, last) => `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(`${first} ${last}`)}&bold=true`;
const demoEmail = new RegExp(`@${catalog.DOMAIN.replace(/\./g, '\\.')}$`, 'i');

// Same numbers every run, so repeated runs produce the same enrolments
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function demoUser({ first, last, accountType, about, gender }) {
  const email = emailFor(first, last);
  const existing = await User.findOne({ email });
  if (existing) return { user: existing, created: false };
  const profile = await Profile.create({ gender: gender || null, dateOfBirth: null, about: about || null, contactNumber: null });
  // A random password nobody knows: demo accounts can't be signed in to
  const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  const user = await User.create({
    firstName: first, lastName: last, email, password, accountType,
    additionalDetails: profile._id, image: avatar(first, last),
  });
  return { user, created: true };
}

async function seedDemo(log = console.log) {
  const counts = { instructors: 0, categories: 0, courses: 0, students: 0, enrolments: 0, paths: 0 };

  const instructorByKey = {};
  for (const i of catalog.instructors) {
    const { user, created } = await demoUser({ first: i.first, last: i.last, accountType: 'Instructor', about: i.about, gender: i.gender });
    instructorByKey[i.key] = user;
    if (created) counts.instructors++;
  }

  for (const c of catalog.categories) {
    if (!(await Category.findOne({ name: c.name }))) { await Category.create({ ...c, courses: [] }); counts.categories++; }
  }

  const courseByName = {};
  for (const c of catalog.courses) {
    const existing = await Course.findOne({ courseName: c.name });
    if (existing) { courseByName[c.name] = existing; continue; }
    const category = await Category.findOne({ name: c.cat });
    if (!category) { log(`Demo seed: category "${c.cat}" not found, skipping ${c.name}`); continue; }
    const slug = slugify(c.name);
    const rand = rng(slug.length * 7919 + c.price);

    const sectionIds = [];
    for (const [sectionName, lessons] of c.sections) {
      const subs = await SubSection.insertMany(lessons.map((l) => {
        const [title, minutes] = l.split('|');
        return {
          title,
          description: `${title}, part of "${sectionName}" in ${c.name}.`,
          timeDuration: String(Number(minutes) * 60 + Math.floor(rand() * 50)),
          videoUrl: `${ASSET_BASE}/video/${slug}.mp4`,
        };
      }));
      const section = await Section.create({ sectionName, subSection: subs.map((s) => s._id) });
      sectionIds.push(section._id);
    }

    const instructor = instructorByKey[c.by];
    const course = await Course.create({
      courseName: c.name,
      courseDescription: c.desc,
      instructor: instructor._id,
      whatYouWillLearn: [c.learn.join('\n')],
      courseContent: sectionIds,
      price: c.price,
      thumbnail: `${ASSET_BASE}/thumbs/${slug}.jpg`,
      tags: c.tags,
      category: category._id,
      studentsEnrolled: [],
      instructions: c.req,
      status: 'Published',
    });
    await Category.updateOne({ _id: category._id }, { $addToSet: { courses: course._id } });
    await User.updateOne({ _id: instructor._id }, { $addToSet: { courses: course._id } });
    courseByName[c.name] = course;
    counts.courses++;
  }

  // Students follow one learning track each; earlier courses in a track are further along
  for (let n = 0; n < catalog.studentNames.length; n++) {
    const [first, last] = catalog.studentNames[n];
    const { user, created } = await demoUser({ first, last, accountType: 'Student' });
    if (!created) continue; // enrolments were made when this student was created
    counts.students++;
    const rand = rng(1000 + n);
    const track = catalog.tracks[n % catalog.tracks.length];
    const take = 1 + Math.floor(rand() * track.length);
    for (let t = 0; t < take; t++) {
      const course = courseByName[track[t]];
      if (!course) continue;
      const sections = await Section.find({ _id: { $in: course.courseContent } }).lean();
      const order = course.courseContent.map(String);
      sections.sort((a, b) => order.indexOf(String(a._id)) - order.indexOf(String(b._id)));
      const lessons = sections.flatMap((s) => s.subSection);
      // Share of the course finished: high for the first course in the track, lower after
      const share = Math.min(1, Math.max(0, (t === 0 ? 0.55 : 0.15) + rand() * 0.5 - t * 0.1));
      const done = lessons.slice(0, Math.round(lessons.length * share));
      const progress = await CourseProgress.create({ courseID: course._id, userId: user._id, completedVideos: done });
      await Course.updateOne({ _id: course._id }, { $addToSet: { studentsEnrolled: user._id } });
      await User.updateOne({ _id: user._id }, { $addToSet: { courses: course._id, courseProgress: progress._id } });
      counts.enrolments++;
    }
  }

  for (const p of catalog.paths) {
    if (await Path.findOne({ slug: p.slug })) continue;
    const ids = p.courses.map((name) => courseByName[name]?._id).filter(Boolean);
    if (ids.length < 2) continue;
    await Path.create({ title: p.title, slug: p.slug, summary: p.summary, level: p.level, courses: ids, published: true });
    counts.paths++;
  }

  log(`Demo seed added: ${JSON.stringify(counts)}`);
  return counts;
}

async function removeDemo(log = console.log) {
  const users = await User.find({ email: demoEmail }).select('_id additionalDetails accountType').lean();
  const userIds = users.map((u) => u._id);
  const instructorIds = users.filter((u) => u.accountType === 'Instructor').map((u) => u._id);

  const courses = await Course.find({ instructor: { $in: instructorIds } }).select('_id courseContent').lean();
  const courseIds = courses.map((c) => c._id);
  const sections = await Section.find({ _id: { $in: courses.flatMap((c) => c.courseContent) } }).select('subSection').lean();

  await SubSection.deleteMany({ _id: { $in: sections.flatMap((s) => s.subSection) } });
  await Section.deleteMany({ _id: { $in: sections.map((s) => s._id) } });
  await CourseProgress.deleteMany({ $or: [{ courseID: { $in: courseIds } }, { userId: { $in: userIds } }] });
  await Category.updateMany({}, { $pull: { courses: { $in: courseIds } } });
  await Path.deleteMany({ slug: { $in: catalog.paths.map((p) => p.slug) } });
  await Path.updateMany({}, { $pull: { courses: { $in: courseIds } } });
  await Course.deleteMany({ _id: { $in: courseIds } });
  // Real students who enrolled in a demo course keep their account; the course is removed from it
  await User.updateMany({ courses: { $in: courseIds } }, { $pull: { courses: { $in: courseIds }, wishlist: { $in: courseIds } } });
  await Course.updateMany({}, { $pull: { studentsEnrolled: { $in: userIds } } });
  await Profile.deleteMany({ _id: { $in: users.map((u) => u.additionalDetails).filter(Boolean) } });
  await User.deleteMany({ _id: { $in: userIds } });
  // Demo categories go only if nothing else uses them
  const removedCats = await Category.deleteMany({ name: { $in: catalog.categories.map((c) => c.name) }, courses: { $size: 0 } });

  const counts = { users: userIds.length, courses: courseIds.length, categories: removedCats.deletedCount || 0 };
  log(`Demo seed removed: ${JSON.stringify(counts)}`);
  return counts;
}

async function runDemoSeed(mode = process.env.SEED_DEMO) {
  const m = String(mode || '').trim().toLowerCase();
  try {
    if (m === 'add') return await seedDemo();
    if (m === 'remove') return await removeDemo();
  } catch (e) {
    console.error('Demo seed failed:', e.message);
  }
  return null;
}

module.exports = { seedDemo, removeDemo, runDemoSeed, emailFor, slugify };
