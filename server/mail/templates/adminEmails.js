// Emails sent as a result of admin actions.
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SITE = (process.env.FRONTEND_URL || 'https://studynotion-project-1.netlify.app').replace(/\/$/, '');

const shell = (title, body, button) => `<!DOCTYPE html>
<html><body style="margin:0;background:#F6F6FB;font-family:Arial,Helvetica,sans-serif;color:#14172E">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="font-size:20px;font-weight:bold;margin:0 0 24px">StudyNotion</p>
    <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
    ${body}
    ${button ? `<a href="${button.href}" style="display:inline-block;margin-top:8px;background:#F5B841;color:#14172E;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:12px">${button.text}</a>` : ''}
  </div>
</body></html>`;
const p = (text) => `<p style="font-size:16px;line-height:1.5;margin:0 0 16px">${text}</p>`;

exports.courseReviewEmail = (firstName, courseName, approved, note) =>
  approved
    ? shell(`${esc(courseName)} is live`, p(`Good news, ${esc(firstName)}: your course was approved and is now in the catalog.`), { href: `${SITE}/dashboard/my-courses`, text: 'See your courses' })
    : shell(
        `Changes needed: ${esc(courseName)}`,
        p(`Hi ${esc(firstName)}, your course wasn't approved yet. Here's what the reviewer asked for:`) +
          `<blockquote style="margin:0 0 16px;padding:12px 16px;background:#FFFFFF;border-left:3px solid #F5B841;font-size:16px;line-height:1.5">${esc(note)}</blockquote>` +
          p('Make the changes, then publish again to send it for review.'),
        { href: `${SITE}/dashboard/my-courses`, text: 'Edit your course' }
      );

exports.refundEmail = (firstName, courseNames, amount) =>
  shell('Your refund is on its way', p(`Hi ${esc(firstName)}, we've refunded ₹${Number(amount).toLocaleString('en-IN')} for ${esc(courseNames)}. It usually reaches your account in 5–7 working days. Access to these courses has ended.`));

exports.suspensionEmail = (firstName, suspended, reason) =>
  suspended
    ? shell('Your account is suspended', p(`Hi ${esc(firstName)}, your StudyNotion account has been suspended, so you can't log in for now.`) + p(`Reason: ${esc(reason)}`) + p('Reply to this email if you think this is a mistake.'))
    : shell('Your account is active again', p(`Hi ${esc(firstName)}, your StudyNotion account has been reactivated. You can log in as usual.`), { href: `${SITE}/login`, text: 'Log in' });
