import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import { apiConnector } from "../../../services/apiconnector";
import { profileEndpoints } from "../../../services/apis";

const GOALS = [1, 2, 3, 5, 7, 10, 14];
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const monthName = (y, m) => new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const keyOf = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Month grid of learning days; darker squares mean more lessons that day. */
export function StreakCalendar({ today, history, bare = false }) {
  const [ty, tm] = today.split("-").map(Number);
  const [view, setView] = useState({ y: ty, m: tm - 1 });
  const byDay = new Map(history.map((d) => [d.day, d.lessons]));
  const first = history[0]?.day || today;
  const [fy, fm] = first.split("-").map(Number);
  const canPrev = view.y * 12 + view.m > fy * 12 + (fm - 1);
  const canNext = view.y * 12 + view.m < ty * 12 + (tm - 1);
  const daysIn = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7; // Monday first
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  const step = (n) => setView(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));
  const activeThisMonth = cells.filter((d) => d && byDay.get(keyOf(view.y, view.m, d))).length;

  return (
    <div className={`flex flex-col gap-3 ${bare ? "rounded-xl border border-line bg-bg/50 p-4" : "rounded-2xl border border-line bg-surface p-5"}`}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => step(-1)} disabled={!canPrev} aria-label="Previous month" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink disabled:opacity-30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <p className="font-semibold text-ink" aria-live="polite">{monthName(view.y, view.m)}</p>
        <button type="button" onClick={() => step(1)} disabled={!canNext} aria-label="Next month" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink disabled:opacity-30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted" aria-hidden="true">
        {DOW.map((d) => <span key={d}>{d}</span>)}
      </div>
      <ol className="grid grid-cols-7 gap-1.5" aria-label={`Learning days in ${monthName(view.y, view.m)}`}>
        {cells.map((d, i) => {
          if (!d) return <li key={`x${i}`} aria-hidden="true" />;
          const key = keyOf(view.y, view.m, d);
          const n = byDay.get(key) || 0;
          const level = n === 0 ? "" : n === 1 ? "bg-accent/40 text-ink" : n <= 3 ? "bg-accent/70 text-ink" : "btn-grad";
          const label = `${longDay(key)}: ${n ? `${n} ${n === 1 ? "lesson" : "lessons"}` : "no lessons"}`;
          return (
            <li key={key} title={label}>
              <span role="img" aria-label={label} className={`grid aspect-square place-items-center rounded-md text-xs font-semibold ${n ? level : "bg-bg text-muted"} ${key === today ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""}`}>
                {d}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-muted">
        {activeThisMonth ? `${activeThisMonth} ${activeThisMonth === 1 ? "day" : "days"} with a lesson this month.` : "No lessons yet this month."}
      </p>
    </div>
  );
}

const longDay = (key) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });

/** Streak, weekly goal and the last 14 days, at the top of My learning. Quietly hides if it can't load. */
export default function LearningStats() {
  const { token } = useSelector((s) => s.auth);
  const [stats, setStats] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiConnector("GET", profileEndpoints.LEARNING_STATS_API, null, { Authorization: `Bearer ${token}` });
      setStats(res.data?.data || null);
    } catch (error) {
      console.error("Learning stats:", error);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const setGoal = async (goal) => {
    setSaving(true);
    const id = toast.loading("Saving your goal…");
    try {
      const res = await apiConnector("PUT", profileEndpoints.WEEKLY_GOAL_API, { goal }, { Authorization: `Bearer ${token}` });
      setStats(res.data?.data);
      toast.success(res.data?.message || "Goal saved", { id });
    } catch (error) {
      toast.error(error.response?.data?.message || "Your goal couldn't be saved.", { id });
    } finally {
      setSaving(false);
    }
  };

  if (!stats) return null;

  const { currentStreak, bestStreak, learnedToday, thisWeek, weeklyGoal, today, history } = stats;
  const pct = Math.min(100, Math.round((thisWeek / weeklyGoal) * 100));
  const goalMet = thisWeek >= weeklyGoal;
  const streakText =
    currentStreak === 0
      ? "Finish a lesson today to start a streak."
      : learnedToday
        ? "You've learned today. Keep it going tomorrow."
        : "Finish a lesson today to keep your streak.";

  return (
    <section aria-label="Your learning progress" className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
      <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-baseline gap-3">
          <p className="font-display text-4xl font-semibold text-ink">{currentStreak}</p>
          <p className="font-semibold text-ink">day streak</p>
          {bestStreak > currentStreak && <p className="ml-auto text-sm text-muted">Best: {bestStreak} {bestStreak === 1 ? "day" : "days"}</p>}
        </div>
        <p className="text-sm text-muted">{streakText}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold text-ink">This week</p>
          <label className="flex items-center gap-2 text-sm text-muted">
            Goal
            <select
              value={weeklyGoal}
              disabled={saving}
              onChange={(e) => setGoal(Number(e.target.value))}
              className="rounded-lg border border-field bg-bg px-2 py-1 text-ink"
            >
              {[...new Set([...GOALS, weeklyGoal])].sort((a, b) => a - b).map((g) => (
                <option key={g} value={g}>
                  {g} {g === 1 ? "lesson" : "lessons"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="font-display text-4xl font-semibold text-ink">
          {thisWeek}
          <span className="text-xl text-muted"> / {weeklyGoal} lessons</span>
        </p>
        <div className="h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={weeklyGoal} aria-valuenow={Math.min(thisWeek, weeklyGoal)} aria-label="Weekly goal progress">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-muted">
          {goalMet ? "Goal reached this week. Nice work!" : `${weeklyGoal - thisWeek} more to reach your goal. Weeks start on Monday.`}
        </p>
      </div>
      </div>
      {today && <StreakCalendar today={today} history={history || []} />}
    </section>
  );
}
