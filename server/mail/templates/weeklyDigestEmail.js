// Weekly learning reminder (Sundays) for students who learned in the last four weeks.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

exports.weeklyDigestEmail = ({ firstName, thisWeek, weeklyGoal, currentStreak, continueTitle, continueUrl, unsubscribeUrl, settingsUrl }) => {
  const metGoal = thisWeek >= weeklyGoal;
  const headline = thisWeek === 0
    ? 'A new week is a good time to pick it back up'
    : metGoal ? `You hit your weekly goal: ${thisWeek} lessons` : `${thisWeek} of ${weeklyGoal} lessons this week`;
  const line = thisWeek === 0
    ? "You didn't finish a lesson this week. Even one short lesson keeps your progress moving."
    : metGoal ? 'Nice work. Keep the rhythm going next week.' : `${weeklyGoal - thisWeek} more ${weeklyGoal - thisWeek === 1 ? 'lesson' : 'lessons'} would have met your goal. You can catch up next week.`;
  const stat = (label, value) => `<td style="padding:14px 16px;background:#FFFFFF;border:1px solid #E4E4EE;border-radius:12px;text-align:left;width:50%"><div style="font-size:13px;color:#4A4F6E">${label}</div><div style="font-size:22px;font-weight:bold;margin-top:4px">${esc(value)}</div></td>`;
  return `<!DOCTYPE html>
<html><body style="margin:0;background:#F6F6FB;font-family:Arial,Helvetica,sans-serif;color:#14172E">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="font-size:20px;font-weight:bold;margin:0 0 24px">StudyNotion</p>
    <p style="font-size:16px;margin:0 0 8px">Hi ${esc(firstName)},</p>
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 10px">${esc(headline)}</h1>
    <p style="font-size:16px;line-height:1.5;margin:0 0 20px">${esc(line)}</p>
    <table role="presentation" cellspacing="8" cellpadding="0" style="width:100%;margin:0 -8px 20px"><tr>${stat('Lessons this week', `${thisWeek} / ${weeklyGoal}`)}${stat('Current streak', `${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`)}</tr></table>
    ${continueTitle ? `<p style="font-size:15px;color:#4A4F6E;margin:0 0 10px">Pick up where you left off: <strong style="color:#14172E">${esc(continueTitle)}</strong></p>` : ''}
    <a href="${esc(continueUrl)}" style="display:inline-block;background:#4C63C9;color:#FFFFFF;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:12px">Continue learning</a>
    <p style="font-size:13px;line-height:1.5;color:#6B6F86;margin:32px 0 0">You get this email on Sundays because you learned on StudyNotion recently.
      <a href="${esc(unsubscribeUrl)}" style="color:#4C63C9">Stop these emails</a> or change it in <a href="${esc(settingsUrl)}" style="color:#4C63C9">Settings</a>.</p>
  </div>
</body></html>`;
};
