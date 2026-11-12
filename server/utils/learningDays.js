/*
 * Streaks and weekly goals from User.learningDays ([{ day: "YYYY-MM-DD", lessons }]).
 * Days are in India time (UTC+5:30), the site's audience, so "today" matches the learner's day.
 */
const IST_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (date = new Date()) => new Date(date.getTime() + IST_MS).toISOString().slice(0, 10);
const addDays = (key, n) => new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** Monday of the week containing `key`. */
const weekStart = (key) => {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(key, -((dow + 6) % 7));
};

/** Adds one finished lesson to today's entry and keeps the last 120 days. */
function recordLesson(days = [], now = new Date()) {
  const today = dayKey(now);
  const list = days.map((d) => ({ day: d.day, lessons: d.lessons }));
  const hit = list.find((d) => d.day === today);
  if (hit) hit.lessons += 1;
  else list.push({ day: today, lessons: 1 });
  const cutoff = addDays(today, -120);
  return list.filter((d) => d.day > cutoff).sort((a, b) => a.day.localeCompare(b.day));
}

/**
 * current: consecutive days with a lesson, ending today, or yesterday if nothing yet today
 * (a streak isn't broken until the day is over).
 */
function summarize(days = [], weeklyGoal = 3, now = new Date()) {
  const today = dayKey(now);
  const active = new Set(days.filter((d) => d.lessons > 0).map((d) => d.day));
  let cursor = active.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (active.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  // Longest run in the stored history
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of [...active].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const monday = weekStart(today);
  const thisWeek = days.filter((d) => d.day >= monday && d.day <= today).reduce((n, d) => n + d.lessons, 0);
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const key = addDays(today, i - 13);
    return { day: key, lessons: days.find((d) => d.day === key)?.lessons || 0 };
  });
  return { currentStreak: current, bestStreak: Math.max(best, current), learnedToday: active.has(today), thisWeek, weeklyGoal, last14 };
}

module.exports = { dayKey, recordLesson, summarize };
