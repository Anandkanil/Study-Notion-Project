/*
 * POST /auth/demo { role } — signs a visitor in to a shared, read-only demo account.
 *
 * Student and instructor use accounts from the demo catalogue (seed/demo.js), so they
 * come with enrolments, progress and courses. The demo admin is created on first use.
 * All of them use the reserved .test domain and a random password nobody knows.
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');
const { DEMO_DOMAIN } = require('../utils/demoSession');

const SESSION_HOURS = 12;
const ADMIN_EMAIL = `demo.admin@${DEMO_DOMAIN}`;
const INSTRUCTOR_EMAIL = `meera.krishnan@${DEMO_DOMAIN}`;
const demoEmail = new RegExp(`@${DEMO_DOMAIN.replace(/\./g, '\\.')}$`, 'i');

// India time, matching utils/learningDays
const dayKey = (d) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);

async function findStudent() {
  const students = await User.find({ email: demoEmail, accountType: 'Student' }).select('_id courses learningDays');
  if (!students.length) return null;
  const pick = students.reduce((a, b) => ((b.courses || []).length > (a.courses || []).length ? b : a));
  // Give the demo student a believable recent streak the first time it is used
  if (!(pick.learningDays || []).length) {
    const now = new Date();
    const days = [0, 1, 2, 3, 5, 6, 8, 9, 10, 13].map((n) => ({ day: dayKey(new Date(now - n * 864e5)), lessons: 1 + (n % 3) }));
    await User.updateOne({ _id: pick._id }, { $set: { learningDays: days.reverse() } });
  }
  return pick;
}

async function findOrCreateAdmin() {
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) return existing;
  const profile = await Profile.create({ gender: null, dateOfBirth: null, about: 'Read-only demo administrator.', contactNumber: null });
  const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  return User.create({
    firstName: 'Demo', lastName: 'Admin', email: ADMIN_EMAIL, password, accountType: 'Admin',
    additionalDetails: profile._id, image: 'https://api.dicebear.com/9.x/initials/svg?seed=Demo%20Admin&bold=true',
  });
}

exports.demoLogin = async (req, res) => {
  const role = String(req.body?.role || '').toLowerCase();
  if (!['student', 'instructor', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Choose student, instructor or admin.' });
  }
  try {
    let found;
    if (role === 'student') found = await findStudent();
    else if (role === 'instructor') found = (await User.findOne({ email: INSTRUCTOR_EMAIL })) || (await User.findOne({ email: demoEmail, accountType: 'Instructor' }));
    else found = await findOrCreateAdmin();
    if (!found) return res.status(404).json({ success: false, message: "The demo isn't available right now. Create a free account instead." });

    const user = await User.findById(found._id).populate('additionalDetails');
    const token = jwt.sign({ userId: user._id, email: user.email, accountType: user.accountType, demo: true }, process.env.JWT_SECRET, { expiresIn: `${SESSION_HOURS}h` });
    const data = user.toObject();
    delete data.password;
    data.token = token;
    data.demo = true;
    res.cookie('token', token, { expires: new Date(Date.now() + SESSION_HOURS * 3600e3), httpOnly: true, secure: true, sameSite: 'lax' });
    return res.status(200).json({ success: true, message: `Signed in to the ${role} demo`, token, data });
  } catch (error) {
    console.error('Demo login:', error.message);
    return res.status(500).json({ success: false, message: "The demo isn't available right now. Please try again." });
  }
};
