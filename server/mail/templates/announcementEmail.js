// An instructor's announcement, emailed to enrolled students.
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SITE = (process.env.FRONTEND_URL || 'https://studynotion-project-1.netlify.app').replace(/\/$/, '');

exports.announcementEmail = (firstName, instructorName, courseName, title, body, courseId) => `<!DOCTYPE html>
<html><body style="margin:0;background:#F6F6FB;font-family:Arial,Helvetica,sans-serif;color:#14172E">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="font-size:20px;font-weight:bold;margin:0 0 4px">StudyNotion</p>
    <p style="font-size:14px;color:#4A4F6E;margin:0 0 24px">Announcement in ${esc(courseName)}</p>
    <h1 style="font-size:22px;margin:0 0 12px">${esc(title)}</h1>
    <p style="font-size:16px;line-height:1.6;margin:0 0 8px;white-space:pre-line">${esc(body)}</p>
    <p style="font-size:14px;color:#4A4F6E;margin:16px 0 24px">— ${esc(instructorName)}</p>
    <a href="${SITE}/dashboard/enrolled-courses" style="display:inline-block;background:#F5B841;color:#14172E;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:12px">Open My learning</a>
    <p style="font-size:12px;color:#4A4F6E;margin:24px 0 0">Hi ${esc(firstName)}, you're getting this because you're enrolled in ${esc(courseName)}.</p>
  </div>
</body></html>`;
