/*
 * Sign in with Google or GitHub, alongside email + password.
 *
 * - The site asks GET /auth/providers which buttons to show (client ids are public).
 * - Google: the browser gets an ID token from Google; we check it with Google's tokeninfo
 *   endpoint (audience = our client id, email verified) before trusting it.
 * - GitHub: the browser gets a one-time code; we swap it for a token with our client secret
 *   and read the account's primary verified email.
 * - Same verified email as an existing account = that account (no duplicates).
 *   New people get a Student account, or Instructor if they picked it on the sign-up page.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Profile = require('../models/Profile');

const SESSION_DAYS = 7;
const ROLES = ['Student', 'Instructor'];
const http = (...args) => exports._fetch(...args);
exports._fetch = (...args) => fetch(...args); // replaced in tests

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (s, n = 60) => String(s || '').trim().slice(0, n);

exports.providers = (req, res) => {
  const google = process.env.GOOGLE_CLIENT_ID || '';
  const github = process.env.GITHUB_CLIENT_ID || '';
  return res.status(200).json({
    success: true,
    data: { google: google ? { clientId: google } : null, github: github && process.env.GITHUB_CLIENT_SECRET ? { clientId: github } : null },
  });
};

async function findOrCreate({ email, firstName, lastName, image, provider, providerId, accountType }) {
  const existing = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') }).populate('additionalDetails');
  if (existing) {
    if (existing.suspended) return { error: [403, 'This account is suspended. Contact support if you think this is a mistake.'] };
    const field = provider === 'google' ? 'googleId' : 'githubId';
    if (!existing[field]) {
      existing[field] = providerId;
      await existing.save().catch((e) => console.error('link provider:', e.message));
    }
    return { user: existing, created: false };
  }
  const role = ROLES.includes(accountType) ? accountType : 'Student';
  const first = clean(firstName) || email.split('@')[0].slice(0, 40);
  const last = clean(lastName) || '';
  // A random password nobody knows; they can set one later with "Forgot password"
  const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  const profile = await Profile.create({ gender: null, dateOfBirth: null, about: null, contactNumber: null });
  const user = await User.create({
    firstName: first,
    lastName: last || '-',
    email: email.toLowerCase(),
    password,
    accountType: role,
    additionalDetails: profile._id,
    image: image || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(`${first} ${last}`)}&bold=true`,
    [provider === 'google' ? 'googleId' : 'githubId']: providerId,
  });
  const full = await User.findById(user._id).populate('additionalDetails');
  return { user: full || user, created: true };
}

function sendSession(res, user, created) {
  const token = jwt.sign({ userId: user._id, email: user.email, accountType: user.accountType }, process.env.JWT_SECRET, { expiresIn: SESSION_DAYS + 'd' });
  const data = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete data.password;
  data.token = token;
  res.cookie('token', token, { expires: new Date(Date.now() + SESSION_DAYS * 864e5), httpOnly: true, secure: true, sameSite: 'lax' });
  return res.status(200).json({ success: true, message: created ? 'Account created' : 'Login successful', created, token, data });
}

/**
 * Checks a Google sign-in and returns the person's verified profile, or null.
 * Accepts either an ID token (`credential`, from Google's own button) or an access token
 * (`accessToken`, from our custom button using Google's token popup). Both are checked with Google:
 * issued to our client id, not expired, email verified.
 */
async function verifyGoogle({ credential, accessToken }, clientId) {
  if (credential) {
    const r = await http(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const info = r.ok ? await r.json() : null;
    const issuerOk = info && ['accounts.google.com', 'https://accounts.google.com'].includes(info.iss);
    const fresh = info && Number(info.exp) * 1000 > Date.now();
    if (!info || info.aud !== clientId || !issuerOk || !fresh) return { error: 'Google sign-in failed. Please try again.' };
    return { info };
  }
  const t = await http(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  const tok = t.ok ? await t.json() : null;
  // The token must have been issued to our app, or anyone else's Google token could sign in here
  if (!tok || (tok.aud !== clientId && tok.azp !== clientId) || !(Number(tok.expires_in) > 0)) {
    return { error: 'Google sign-in failed. Please try again.' };
  }
  const u = await http('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
  const info = u.ok ? await u.json() : null;
  if (!info?.sub || info.sub !== tok.sub) return { error: 'Google sign-in failed. Please try again.' };
  return { info };
}

// POST /auth/google { credential | accessToken, accountType }
exports.google = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ success: false, message: "Google sign-in isn't set up yet." });
  const credential = typeof req.body?.credential === 'string' ? req.body.credential : '';
  const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken : '';
  const token = credential || accessToken;
  if (!token || token.length > 4096) return res.status(400).json({ success: false, message: 'Google sign-in failed. Please try again.' });
  try {
    const v = await verifyGoogle({ credential, accessToken }, clientId);
    if (v.error) return res.status(401).json({ success: false, message: v.error });
    const info = v.info;
    if (String(info.email_verified) !== 'true' || !info.email) {
      return res.status(401).json({ success: false, message: 'Your Google email address isn’t verified yet.' });
    }
    const out = await findOrCreate({
      email: info.email, firstName: info.given_name, lastName: info.family_name, image: info.picture,
      provider: 'google', providerId: info.sub, accountType: req.body?.accountType,
    });
    if (out.error) return res.status(out.error[0]).json({ success: false, message: out.error[1] });
    return sendSession(res, out.user, out.created);
  } catch (error) {
    console.error('Google sign-in:', error.message);
    return res.status(500).json({ success: false, message: "Google sign-in isn't working right now. Use your email and password, or try again." });
  }
};

// POST /auth/github { code, redirectUri, accountType }
exports.github = async (req, res) => {
  const id = process.env.GITHUB_CLIENT_ID;
  const secret = process.env.GITHUB_CLIENT_SECRET;
  if (!id || !secret) return res.status(503).json({ success: false, message: "GitHub sign-in isn't set up yet." });
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(code)) return res.status(400).json({ success: false, message: 'GitHub sign-in failed. Please try again.' });
  try {
    const t = await http('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: id, client_secret: secret, code, redirect_uri: req.body?.redirectUri }),
    });
    const tokenBody = await t.json().catch(() => ({}));
    if (!tokenBody.access_token) {
      return res.status(401).json({ success: false, message: 'GitHub sign-in expired. Please try again.' });
    }
    const gh = { Authorization: `Bearer ${tokenBody.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'StudyNotion' };
    const [profileRes, emailsRes] = await Promise.all([http('https://api.github.com/user', { headers: gh }), http('https://api.github.com/user/emails', { headers: gh })]);
    const profile = await profileRes.json();
    const emails = emailsRes.ok ? await emailsRes.json() : [];
    const primary = (Array.isArray(emails) ? emails : []).find((e) => e.primary && e.verified) || (Array.isArray(emails) ? emails : []).find((e) => e.verified);
    if (!primary?.email) {
      return res.status(400).json({ success: false, message: 'Your GitHub account has no verified email. Verify one on GitHub, or sign up with email.' });
    }
    const [firstName, ...rest] = String(profile.name || profile.login || '').trim().split(/\s+/);
    const out = await findOrCreate({
      email: primary.email, firstName, lastName: rest.join(' '), image: profile.avatar_url,
      provider: 'github', providerId: String(profile.id), accountType: req.body?.accountType,
    });
    if (out.error) return res.status(out.error[0]).json({ success: false, message: out.error[1] });
    return sendSession(res, out.user, out.created);
  } catch (error) {
    console.error('GitHub sign-in:', error.message);
    return res.status(500).json({ success: false, message: "GitHub sign-in isn't working right now. Use your email and password, or try again." });
  }
};
