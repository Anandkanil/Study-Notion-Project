/*
 * Weekly learning reminder, sent on Sundays (India time) to students who finished a
 * lesson in the last 28 days and haven't turned the email off.
 *
 * Runs every 30 minutes while the server is up (it's kept awake from 8 am to midnight).
 * Each run sends to at most BATCH people, and no more than DAILY_CAP go out in a day,
 * well under Brevo's free 300 a day. A person gets at most one email a week: they're
 * claimed with an atomic update on `lastDigestWeek` before the email is sent.
 */
const crypto = require('crypto');
const User = require('../models/User');
const Course = require('../models/Course');
const mailSender = require('./mailSender');
const { summarize, dayKey } = require('./learningDays');
const { weeklyDigestEmail } = require('../mail/templates/weeklyDigestEmail');

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://studynotion-project-1.netlify.app').replace(/\/$/, '');
const API_URL = (process.env.PUBLIC_API_URL || 'https://study-notion-project-1-px3q.onrender.com').replace(/\/$/, '');
const BATCH = 40;
const DAILY_CAP = 200;
const SEND_FROM_HOUR = 10; // India time, Sunday 10 am to 8 pm
const SEND_TO_HOUR = 20;

const istNow = (now) => new Date(now.getTime() + 5.5 * 3600e3);
const weekId = (now) => `week-${dayKey(now)}`; // runs only on Sundays, so the date names the week

const unsubscribeToken = (userId) =>
  crypto.createHmac('sha256', `${process.env.JWT_SECRET}:digest`).update(String(userId)).digest('hex').slice(0, 32);
const unsubscribeUrl = (userId) => `${API_URL}/api/v1/profile/digest/unsubscribe?u=${userId}&t=${unsubscribeToken(userId)}`;
const validToken = (userId, token) => {
  const want = Buffer.from(unsubscribeToken(userId));
  const got = Buffer.from(String(token || ''));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
};

function inWindow(now) {
  const ist = istNow(now);
  return ist.getUTCDay() === 0 && ist.getUTCHours() >= SEND_FROM_HOUR && ist.getUTCHours() < SEND_TO_HOUR;
}

async function runWeeklyDigest(now = new Date(), log = console.log) {
  if (!inWindow(now)) return { skipped: 'outside window', sent: 0 };
  const week = weekId(now);
  const already = await User.countDocuments({ lastDigestWeek: week });
  if (already >= DAILY_CAP) return { skipped: 'daily cap', sent: 0 };

  const since = dayKey(new Date(now.getTime() - 28 * 864e5));
  const candidates = await User.find({
    accountType: 'Student',
    suspended: { $ne: true },
    'emailPrefs.weeklyDigest': { $ne: false },
    lastDigestWeek: { $ne: week },
    email: { $not: /\.test$/i },
    learningDays: { $elemMatch: { day: { $gte: since }, lessons: { $gt: 0 } } },
  })
    .select('_id')
    .limit(Math.min(BATCH, DAILY_CAP - already))
    .lean();

  let sent = 0;
  for (const { _id } of candidates) {
    // Claim first, so two runs can never email the same person twice in a week
    const user = await User.findOneAndUpdate(
      { _id, lastDigestWeek: { $ne: week } },
      { $set: { lastDigestWeek: week } },
      { new: true, projection: 'firstName email learningDays weeklyGoal lastLesson' }
    ).lean();
    if (!user) continue;
    const s = summarize(user.learningDays || [], user.weeklyGoal || 3, now);
    let continueTitle = '';
    let continueUrl = `${FRONTEND_URL}/dashboard/overview`;
    if (user.lastLesson?.course) {
      const course = await Course.findById(user.lastLesson.course).select('courseName').lean();
      if (course) {
        continueTitle = course.courseName;
        continueUrl = `${FRONTEND_URL}/view-course/${user.lastLesson.course}/section/${user.lastLesson.section}/sub-section/${user.lastLesson.subSection}`;
      }
    }
    const html = weeklyDigestEmail({
      firstName: user.firstName, thisWeek: s.thisWeek, weeklyGoal: s.weeklyGoal, currentStreak: s.currentStreak,
      continueTitle, continueUrl, unsubscribeUrl: unsubscribeUrl(user._id), settingsUrl: `${FRONTEND_URL}/dashboard/settings`,
    });
    const subject = s.thisWeek >= s.weeklyGoal && s.thisWeek > 0 ? 'You hit your weekly goal' : 'Your week on StudyNotion';
    if (await mailSender(user.email, subject, html)) sent++;
  }
  if (candidates.length) log(`Weekly digest: sent ${sent} of ${candidates.length}`);
  return { sent, considered: candidates.length };
}

let timer = null;
function startWeeklyDigest() {
  if (timer || process.env.WEEKLY_DIGEST === 'off') return;
  const tick = () => runWeeklyDigest().catch((e) => console.error('Weekly digest:', e.message));
  setTimeout(tick, 60 * 1000);
  timer = setInterval(tick, 30 * 60 * 1000);
  timer.unref?.();
}

module.exports = { runWeeklyDigest, startWeeklyDigest, inWindow, unsubscribeToken, unsubscribeUrl, validToken };
