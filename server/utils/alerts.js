/*
 * Emails ALERT_EMAIL when the API answers with a server error (5xx) or crashes.
 * Throttled so a bad hour can't use up the daily email quota:
 *   - at most one alert per route every 30 minutes
 *   - at most 10 alerts a day in total
 * Recent console.error lines are attached, since controllers log the real cause there.
 * Without ALERT_EMAIL set, nothing is sent.
 */
const mailSender = require('./mailSender');

const PER_ROUTE_MS = 30 * 60 * 1000;
const DAILY_MAX = 10;
const recentErrors = []; // last few console.error lines
const lastSentByRoute = new Map();
let day = new Date().toDateString();
let sentToday = 0;

// Keep the last 8 error lines (trimmed) to give each alert some context
const originalError = console.error.bind(console);
console.error = (...args) => {
  const line = args.map((a) => (a instanceof Error ? a.stack || a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  recentErrors.push(`${new Date().toISOString()}  ${line.slice(0, 500)}`);
  if (recentErrors.length > 8) recentErrors.shift();
  originalError(...args);
};

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function sendAlert({ title, route, details }) {
  const to = (process.env.ALERT_EMAIL || '').trim();
  if (!to) return false;
  const today = new Date().toDateString();
  if (today !== day) { day = today; sentToday = 0; }
  const now = Date.now();
  if (sentToday >= DAILY_MAX) return false;
  if (route && now - (lastSentByRoute.get(route) || 0) < PER_ROUTE_MS) return false;
  if (route) lastSentByRoute.set(route, now);
  sentToday += 1;

  const html = `
    <div style="font-family:system-ui,sans-serif;font-size:14px;color:#14172E">
      <h2 style="margin:0 0 8px">${escapeHtml(title)}</h2>
      ${route ? `<p><b>Route:</b> ${escapeHtml(route)}</p>` : ''}
      ${details ? `<p>${escapeHtml(details)}</p>` : ''}
      <p><b>Recent error log:</b></p>
      <pre style="background:#F3F4F8;padding:12px;white-space:pre-wrap">${escapeHtml(recentErrors.join('\n') || '(none)')}</pre>
      <p style="color:#4A4F6E">Alert ${sentToday} of ${DAILY_MAX} today. Same route won't alert again for 30 minutes. Full logs: Render dashboard → Study-Notion-Project-1 → Logs.</p>
    </div>`;
  mailSender.inBackground(to, `StudyNotion alert: ${title}`, html);
  return true;
}

/** Express middleware: alert when any response goes out with status 500 or above. */
function alertOnServerErrors(req, res, next) {
  res.on('finish', () => {
    if (res.statusCode >= 500) {
      const route = `${req.method} ${req.baseUrl || ''}${req.route?.path || req.path}`;
      sendAlert({ title: `Server error ${res.statusCode}`, route });
    }
  });
  next();
}

/** Alerts on crashes the code didn't catch. */
function watchProcess() {
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
    sendAlert({ title: 'Unhandled promise rejection', route: 'process', details: String(reason?.message || reason) });
  });
}

sendAlert._reset = () => { lastSentByRoute.clear(); sentToday = 0; recentErrors.length = 0; };

module.exports = { sendAlert, alertOnServerErrors, watchProcess };
