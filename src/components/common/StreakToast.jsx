import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

/*
 * Celebrates a finished lesson when it moves the learner's streak or weekly goal.
 * `streak` comes from the progress API: { currentStreak, bestStreak, firstToday, newBest, thisWeek, weeklyGoal, goalReached }.
 */
export function celebrateLesson(streak) {
  if (!streak || (!streak.firstToday && !streak.goalReached)) return;
  toast.custom((t) => <StreakToast t={t} streak={streak} />, { id: "streak", duration: 6000 });
}

function copyFor(s) {
  const n = s.currentStreak;
  if (!s.firstToday) {
    return { title: "Weekly goal met", body: `${s.thisWeek} of ${s.weeklyGoal} lessons this week. Nice work.` };
  }
  const title = s.newBest ? `New best: ${n}-day streak` : n === 1 ? "Streak started" : `${n}-day streak`;
  let body = n === 1 ? "You learned today. Come back tomorrow to make it 2." : `You've learned ${n} days in a row. See you tomorrow.`;
  if (s.goalReached) body = `${body} Weekly goal met too: ${s.thisWeek} of ${s.weeklyGoal}.`;
  return { title, body };
}

function StreakToast({ t, streak }) {
  const { title, body } = copyFor(streak);
  const target = streak.firstToday ? streak.currentStreak : streak.thisWeek;
  // Count up from the old value so the change is visible
  const [shown, setShown] = useState(Math.max(target - 1, 0));
  useEffect(() => {
    const id = setTimeout(() => setShown(target), 450);
    return () => clearTimeout(id);
  }, [target]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sn-streak ${t.visible ? "sn-streak-in" : "sn-streak-out"} pointer-events-auto flex w-[min(92vw,400px)] items-center gap-4 rounded-[18px] border border-line bg-surface p-4 pr-3 text-ink`}
    >
      <div className="relative grid h-14 w-14 shrink-0 place-items-center">
        <span className="sn-streak-glow absolute inset-0 rounded-full" aria-hidden="true" />
        {streak.firstToday ? <Flame /> : <Target />}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="sn-spark" style={{ "--i": i }} aria-hidden="true" />
        ))}
        <span className="absolute -bottom-1 -right-1 grid min-w-[26px] place-items-center overflow-hidden rounded-full bg-[rgb(var(--accent))] px-1.5 text-sm font-extrabold leading-6 text-[rgb(var(--on-accent))]">
          <span key={shown} className="sn-tick block">{shown}</span>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold leading-snug">{title}</p>
        <p className="mt-0.5 text-sm leading-snug text-muted">{body}</p>
        <Link
          to="/dashboard/enrolled-courses"
          onClick={() => toast.dismiss(t.id)}
          className="mt-1.5 inline-block text-sm font-semibold text-[rgb(var(--accent-text))] underline-offset-2 hover:underline"
        >
          See your progress
        </Link>
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(t.id)}
        aria-label="Close"
        className="self-start rounded-md p-1 text-muted hover:bg-raised hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--accent))]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}

function Flame() {
  return (
    <svg className="sn-flame relative" width="34" height="40" viewBox="0 0 34 40" aria-hidden="true">
      <path
        d="M17 1c2 7 9 10 12 17 4 9-2 21-12 21S1 31 5 22c2-5 6-6 6-12 4 3 5 6 5 9 2-3 2-9 1-18z"
        fill="rgb(var(--accent))"
      />
      <path d="M17 20c1 4 6 6 6 11a6 6 0 01-12 0c0-3 2-4 3-7 1 1 2 2 2 4 1-2 1-5 1-8z" fill="#ff7a45" />
    </svg>
  );
}

function Target() {
  return (
    <svg className="sn-flame relative" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="16" fill="none" stroke="rgb(var(--accent))" strokeWidth="3" />
      <circle cx="18" cy="18" r="9" fill="none" stroke="rgb(var(--accent))" strokeWidth="3" />
      <circle cx="18" cy="18" r="3.5" fill="rgb(var(--accent))" />
    </svg>
  );
}

export default StreakToast;
