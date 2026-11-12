import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import { apiConnector } from "../../../services/apiconnector";
import { profileEndpoints } from "../../../services/apis";

const GOALS = [1, 2, 3, 5, 7, 10, 14];
const weekday = (key) => new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "narrow", timeZone: "UTC" });
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

  const { currentStreak, bestStreak, learnedToday, thisWeek, weeklyGoal, last14 } = stats;
  const pct = Math.min(100, Math.round((thisWeek / weeklyGoal) * 100));
  const goalMet = thisWeek >= weeklyGoal;
  const streakText =
    currentStreak === 0
      ? "Finish a lesson today to start a streak."
      : learnedToday
        ? "You've learned today. Keep it going tomorrow."
        : "Finish a lesson today to keep your streak.";

  return (
    <section aria-label="Your learning progress" className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-baseline gap-3">
          <p className="font-display text-4xl font-semibold text-ink">{currentStreak}</p>
          <p className="font-semibold text-ink">day streak</p>
          {bestStreak > currentStreak && <p className="ml-auto text-sm text-muted">Best: {bestStreak} days</p>}
        </div>
        <p className="text-sm text-muted">{streakText}</p>
        <ol className="mt-1 flex gap-1.5" aria-label="Last 14 days">
          {last14.map((d) => (
            <li key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${longDay(d.day)}: ${d.lessons} ${d.lessons === 1 ? "lesson" : "lessons"}`}>
              <span
                className={`h-6 w-full max-w-[22px] rounded-md ${d.lessons > 0 ? "bg-accent" : "border border-line bg-bg"}`}
                aria-label={`${longDay(d.day)}: ${d.lessons > 0 ? `${d.lessons} ${d.lessons === 1 ? "lesson" : "lessons"}` : "no lessons"}`}
                role="img"
              />
              <span className="text-[10px] text-muted" aria-hidden="true">
                {weekday(d.day)}
              </span>
            </li>
          ))}
        </ol>
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
    </section>
  );
}
