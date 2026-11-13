/*
 * Email preferences.
 *   PUT /profile/email-prefs { weeklyDigest }        (signed in)
 *   GET /profile/digest/unsubscribe?u=<id>&t=<token> (link in the email; no sign-in needed)
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const { validToken } = require('../utils/weeklyDigest');

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://studynotion-project-1.netlify.app').replace(/\/$/, '');

exports.update = async (req, res) => {
  const { weeklyDigest } = req.body || {};
  if (typeof weeklyDigest !== 'boolean') return res.status(400).json({ success: false, message: 'Choose on or off.' });
  try {
    await User.updateOne({ _id: req.user.userId }, { $set: { 'emailPrefs.weeklyDigest': weeklyDigest } });
    return res.status(200).json({ success: true, data: { weeklyDigest }, message: weeklyDigest ? 'Weekly reminders on' : 'Weekly reminders off' });
  } catch (error) {
    console.error('Email prefs:', error.message);
    return res.status(500).json({ success: false, message: "Couldn't save that. Please try again." });
  }
};

const page = (title, body) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · StudyNotion</title></head>
<body style="margin:0;background:#0F0F0F;color:#FCFCFC;font-family:system-ui,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center">
<main style="max-width:440px;padding:32px 24px"><p style="font-weight:bold;font-size:20px;margin:0 0 24px">StudyNotion</p><h1 style="font-size:24px;margin:0 0 12px">${title}</h1><p style="line-height:1.5;color:#B8B8C7;margin:0 0 24px">${body}</p>
<a href="${FRONTEND_URL}/dashboard/settings" style="color:#C4A8F5;font-weight:bold">Email settings</a></main></body></html>`;

exports.unsubscribe = async (req, res) => {
  const { u, t } = req.query || {};
  res.set('Content-Type', 'text/html; charset=utf-8');
  if (!mongoose.Types.ObjectId.isValid(String(u)) || !validToken(u, t)) {
    return res.status(400).send(page("That link didn't work", 'It may have been copied only in part. You can turn weekly reminders off in Settings instead.'));
  }
  try {
    await User.updateOne({ _id: u }, { $set: { 'emailPrefs.weeklyDigest': false } });
    return res.status(200).send(page("You won't get weekly reminders", 'We\'ve turned off the Sunday learning reminder. Receipts and account emails still arrive. You can turn reminders back on in Settings.'));
  } catch (error) {
    console.error('Unsubscribe:', error.message);
    return res.status(500).send(page('Something went wrong', 'Please try the link again in a minute, or turn reminders off in Settings.'));
  }
};
