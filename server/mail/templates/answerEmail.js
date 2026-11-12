// Sent to a student when the instructor answers their question.
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SITE = (process.env.FRONTEND_URL || 'https://studynotion-project-1.netlify.app').replace(/\/$/, '');

exports.answerEmail = (firstName, courseName, answer, courseId) => `<!DOCTYPE html>
<html><body style="margin:0;background:#F6F6FB;font-family:Arial,Helvetica,sans-serif;color:#14172E">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="font-size:20px;font-weight:bold;margin:0 0 24px">StudyNotion</p>
    <h1 style="font-size:22px;margin:0 0 12px">Your instructor answered your question</h1>
    <p style="font-size:14px;color:#4A4F6E;margin:0 0 12px">${esc(courseName)}</p>
    <blockquote style="margin:0 0 24px;padding:12px 16px;background:#FFFFFF;border-left:3px solid #F5B841;font-size:16px;line-height:1.5;white-space:pre-line">${esc(answer)}</blockquote>
    <a href="${SITE}/dashboard/enrolled-courses" style="display:inline-block;background:#F5B841;color:#14172E;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:12px">Back to the course</a>
    <p style="font-size:12px;color:#4A4F6E;margin:24px 0 0">Hi ${esc(firstName)}, you asked this question in ${esc(courseName)}.</p>
  </div>
</body></html>`;
