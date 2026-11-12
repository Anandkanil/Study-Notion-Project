// Sent once, when a student finishes every lesson of a course.
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

exports.courseCompletionEmail = (firstName, courseName, certificateUrl) => `<!DOCTYPE html>
<html><body style="margin:0;background:#F6F6FB;font-family:Arial,Helvetica,sans-serif;color:#14172E">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="font-size:20px;font-weight:bold;margin:0 0 24px">StudyNotion</p>
    <h1 style="font-size:24px;margin:0 0 12px">You finished ${esc(courseName)}!</h1>
    <p style="font-size:16px;line-height:1.5;margin:0 0 20px">Well done, ${esc(firstName)}. You've completed every lesson, and your certificate is ready to download.</p>
    <a href="${esc(certificateUrl)}" style="display:inline-block;background:#F5B841;color:#14172E;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:12px">Get your certificate</a>
    <p style="font-size:14px;line-height:1.5;color:#4A4F6E;margin:24px 0 0">While you're there, rate the course. It helps other learners choose.</p>
  </div>
</body></html>`;
