const mailSender = require("../utils/mailSender");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.contactUsController = async (req, res) => {
  const { firstname, lastname = "", email, countrycode = "", phoneNo = "", message } = req.body || {};

  if (!firstname || !email || !message) {
    return res.status(400).json({ success: false, message: "First name, email and message are required." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: "Please enter a valid email address." });
  }
  if (String(message).length > 5000) {
    return res.status(400).json({ success: false, message: "Message is too long (5,000 characters max)." });
  }

  const inbox = process.env.CONTACT_EMAIL || process.env.EMAIL_USER;
  const body = `
    <h2>New contact form message</h2>
    <p><strong>Name:</strong> ${escapeHtml(firstname)} ${escapeHtml(lastname)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(countrycode)} ${escapeHtml(phoneNo)}</p>
    <p><strong>Message:</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;

  try {
    const sent = await mailSender(inbox, `Study Notion contact: ${escapeHtml(firstname)}`, body);
    if (!sent) throw new Error("Mail not sent");
    return res.status(200).json({ success: true, message: "Thanks! Your message has been sent." });
  } catch (error) {
    console.error("Contact form error:", error.message);
    return res.status(500).json({ success: false, message: "Could not send your message. Please try again later." });
  }
};
