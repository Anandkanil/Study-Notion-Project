const nodemailer = require('nodemailer');

/*
 * Sends one HTML email. Returns a truthy result on success, null on failure; never throws.
 *
 * Render's free plan blocks outgoing SMTP (ports 25/465/587) since September 2025,
 * so in production email goes through Brevo's HTTPS API when BREVO_API_KEY is set.
 * Without it, Gmail SMTP is tried with short timeouts (works locally, fails fast on Render).
 */
const SEND_TIMEOUT_MS = 10000;

async function sendWithBrevo(to, subject, html) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: process.env.MAIL_FROM_NAME || 'StudyNotion', email: process.env.MAIL_FROM || process.env.EMAIL_USER },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`Brevo email failed (${res.status}):`, detail.slice(0, 300));
      return null;
    }
    return await res.json().catch(() => ({ ok: true }));
  } finally {
    clearTimeout(timer);
  }
}

async function sendWithSmtp(to, subject, html) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: SEND_TIMEOUT_MS,
  });
  return transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
}

const mailSender = async (email, title, body) => {
  try {
    if (process.env.BREVO_API_KEY) return await sendWithBrevo(email, title, body);
    return await sendWithSmtp(email, title, body);
  } catch (error) {
    console.error('Error sending email:', error.name === 'AbortError' ? 'timed out' : error.message);
    return null;
  }
};

/** Fire-and-forget: for emails the user doesn't need before the response (receipts, confirmations). */
mailSender.inBackground = (email, title, body) => {
  mailSender(email, title, body).catch(() => {});
};

module.exports = mailSender;
