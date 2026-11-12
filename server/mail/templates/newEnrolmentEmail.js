// Sent to an instructor when a student enrols in one of their courses.
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SITE = (process.env.FRONTEND_URL || 'https://studynotion-project-1.netlify.app').replace(/\/$/, '');

exports.newEnrolmentEmail = (instructorName, studentName, courseName, totalStudents) => `<!DOCTYPE html>
<html><body style="margin:0;background:#F6F6FB;font-family:Arial,Helvetica,sans-serif;color:#14172E">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="font-size:20px;font-weight:bold;margin:0 0 24px">StudyNotion</p>
    <h1 style="font-size:22px;margin:0 0 12px">${esc(studentName)} just enrolled in ${esc(courseName)}</h1>
    <p style="font-size:16px;line-height:1.5;margin:0 0 20px">Hi ${esc(instructorName)}, your course now has ${Number(totalStudents) || 1} ${Number(totalStudents) === 1 ? 'student' : 'students'}.</p>
    <a href="${SITE}/dashboard/my-courses" style="display:inline-block;background:#F5B841;color:#14172E;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:12px">See your course stats</a>
  </div>
</body></html>`;
