import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { apiConnector } from "../../../services/apiconnector";
import { profileEndpoints } from "../../../services/apis";
import { StreakCalendar } from "./LearningStats";

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const card = "rounded-2xl border border-ink/[0.08] bg-surface";

const ICON = {
  courses: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5",
  lessons: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM10 9l5 3-5 3z",
  flame: "M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-7z",
  award: "M6 9a6 6 0 1 0 12 0a6 6 0 1 0-12 0M8.5 14L7 21l5-3 5 3-1.5-7",
  arrow: "M7 17L17 7M9 7h8v8",
};
const Svg = ({ d, size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d={d} />
  </svg>
);

function StatCard({ icon, label, value, hint, to }) {
  return (
    <Link to={to} className={`${card} group flex flex-col gap-4 p-5 transition-colors hover:border-ink/20`}>
      <span className="flex items-center gap-2 text-sm font-medium text-muted">
        <Svg d={icon} />
        {label}
        <Svg d={ICON.arrow} size={15} className="ml-auto opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
      <span className="flex items-end justify-between gap-2">
        <span className="text-4xl font-bold tracking-tight text-ink">{value}</span>
        <span className="pb-1 text-xs font-medium text-success">{hint}</span>
      </span>
    </Link>
  );
}

const dayKey = (d) => d.toISOString().slice(0, 10);
const shortDay = (key, range) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", range === "week" ? { weekday: "short", timeZone: "UTC" } : { day: "numeric", timeZone: "UTC" });

/** Lessons finished per day, as columns. Empty state like codehelp's, with faint ghost bars. */
function ActivityChart({ today, history }) {
  const [range, setRange] = useState("week");
  const days = useMemo(() => {
    if (!today) return [];
    const n = range === "week" ? 7 : 30;
    const end = new Date(`${today}T00:00:00Z`);
    const by = new Map(history.map((h) => [h.day, h.lessons]));
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(end);
      d.setUTCDate(end.getUTCDate() - (n - 1 - i));
      const key = dayKey(d);
      return { key, lessons: by.get(key) || 0 };
    });
  }, [today, history, range]);
  const max = Math.max(1, ...days.map((d) => d.lessons));
  const total = days.reduce((n, d) => n + d.lessons, 0);
  const ghost = [42, 18, 80, 55, 30, 62, 24, 70, 38, 50, 20, 66];

  return (
    <section aria-labelledby="activity-title" className={`${card} flex flex-col gap-5 p-6 xl:col-span-2`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="activity-title" className="text-2xl font-bold tracking-tight text-ink">
            Learning activity
          </h2>
          <p className="mt-1 text-sm text-muted">{total ? `${total} ${total === 1 ? "lesson" : "lessons"} finished ${range === "week" ? "in the last 7 days" : "in the last 30 days"}` : "Lessons you finish each day"}</p>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-line bg-bg px-3 text-sm font-semibold text-ink">
          <span className="sr-only">Range</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="h-10 bg-transparent pr-1 outline-none">
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
        </label>
      </div>

      <div className="relative h-[260px]">
        {total === 0 ? (
          <>
            <div className="absolute inset-0 flex items-end gap-2 opacity-60" aria-hidden="true">
              {ghost.map((h, i) => (
                <span key={i} className="flex-1 rounded-t-lg bg-raised" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div className="max-w-sm px-4">
                <p className="text-lg font-semibold text-ink">Nothing to show here</p>
                <p className="mt-1 text-sm text-muted">There's no activity yet. Finish a lesson and it shows up here, along with your streak.</p>
              </div>
            </div>
          </>
        ) : (
          <ol className="flex h-full items-end gap-1.5" aria-label="Lessons finished per day">
            {days.map((d) => {
              const label = `${new Date(`${d.key}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}: ${d.lessons} ${d.lessons === 1 ? "lesson" : "lessons"}`;
              return (
                <li key={d.key} className="group relative flex h-full flex-1 flex-col justify-end gap-2" aria-label={label}>
                  <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-raised px-2 py-1 text-xs text-ink group-hover:block" aria-hidden="true">
                    {label}
                  </span>
                  <span className={`block w-full rounded-t-[4px] ${d.lessons ? "btn-grad" : "bg-raised"}`} style={{ height: `${d.lessons ? Math.max(6, (d.lessons / max) * 85) : 3}%` }} />
                  <span className={`text-center text-[11px] text-muted ${range === "month" && Number(shortDay(d.key, "month")) % 5 !== 1 ? "invisible" : ""}`} aria-hidden="true">
                    {shortDay(d.key, range)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function ContinueList({ courses, all = false }) {
  const inProgress = all ? courses : courses.filter((c) => (c.progressPercentage || 0) < 100).slice(0, 4);
  return (
    <section aria-labelledby="continue-title" className={`${card} flex flex-col gap-4 p-6 xl:col-span-2`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="continue-title" className="text-2xl font-bold tracking-tight text-ink">
            {all ? "All your courses" : "Continue learning"}
          </h2>
          <p className="mt-1 text-sm text-muted">{all ? "Progress on every course you own" : "Courses you've started"}</p>
        </div>
        <Link to="/dashboard/enrolled-courses" className="rounded-xl border border-line px-3.5 py-2 text-sm font-semibold text-ink hover:bg-raised">
          See all
        </Link>
      </div>
      {inProgress.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center">
          <p className="font-semibold text-ink">{courses.length ? "You've finished every course you own" : "No courses yet"}</p>
          <p className="mt-1 text-sm text-muted">{courses.length ? "Pick something new from the catalog." : "Every course has a free first lesson to try."}</p>
          <Link to="/search" className="btn-grad mt-4 inline-flex min-h-[42px] items-center rounded-xl px-4 text-sm font-semibold">
            Browse courses
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {inProgress.map((c) => {
            const pct = Math.round(c.progressPercentage || 0);
            return (
              <li key={c._id}>
                <Link to="/dashboard/enrolled-courses" className="flex items-center gap-4 rounded-xl border border-line p-3 transition-colors hover:bg-raised">
                  <img src={c.thumbnail} alt="" className="hidden aspect-video w-24 rounded-lg object-cover sm:block" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{c.courseName}</span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-raised">
                      <span className="btn-grad block h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </span>
                  </span>
                  <span className="w-12 text-right text-sm font-semibold text-muted">{pct}%</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function GoalCard({ stats }) {
  const goal = stats?.weeklyGoal || 0;
  const done = stats?.thisWeek || 0;
  const pct = goal ? Math.min(100, Math.round((done / goal) * 100)) : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <section aria-labelledby="goal-title" className={`${card} flex flex-col items-center gap-4 p-6 text-center`}>
      <div className="self-stretch text-left">
        <h2 id="goal-title" className="text-2xl font-bold tracking-tight text-ink">
          Weekly goal
        </h2>
        <p className="mt-1 text-sm text-muted">Weeks start on Monday</p>
      </div>
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
          <defs>
            <linearGradient id="goal-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgb(var(--grad-from))" />
              <stop offset="1" stopColor="rgb(var(--grad-to))" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(var(--raised))" strokeWidth="10" />
          <circle cx="60" cy="60" r={r} fill="none" stroke="url(#goal-g)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
        </svg>
        <p className="absolute inset-0 grid place-items-center text-ink">
          <span>
            <span className="block text-3xl font-bold">
              {done}/{goal}
            </span>
            <span className="text-xs text-muted">lessons</span>
          </span>
        </p>
      </div>
      <p className="text-sm text-muted">{done >= goal && goal ? "Goal met this week. Great work!" : `${Math.max(0, goal - done)} more to reach your goal.`}</p>
      <Link to="/dashboard/enrolled-courses" className="text-sm font-semibold text-accent-text hover:underline">
        Change goal
      </Link>
    </section>
  );
}

function SavedList() {
  const { list } = useSelector((s) => s.savedLessons);
  if (!list.length)
    return (
      <div className={`${card} p-8 text-center`}>
        <p className="font-semibold text-ink">No saved lessons yet</p>
        <p className="mt-1 text-sm text-muted">Press the bookmark next to any lesson title to save it here.</p>
      </div>
    );
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {list.slice(0, 12).map((l) => (
        <li key={l.subSectionId}>
          <Link to={`/view-course/${l.courseId}/section/${l.sectionId}/sub-section/${l.subSectionId}`} className={`${card} flex items-center gap-3 p-4 hover:border-ink/20`}>
            <Svg d="M6 3h12v18l-6-4-6 4z" className="text-accent-text" />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-ink">{l.title}</span>
              <span className="block truncate text-sm text-muted">{l.courseName}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Student home: summary cards, activity chart, streak calendar, courses in progress. */
export default function StudentOverview() {
  const { token } = useSelector((s) => s.auth);
  const { user } = useSelector((s) => s.profile);
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState("summary");

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const [s, c] = await Promise.all([
        apiConnector("GET", profileEndpoints.LEARNING_STATS_API, null, auth(token)),
        apiConnector("GET", profileEndpoints.GET_USER_ENROLLED_COURSES_API, null, auth(token)),
      ]);
      setStats(s.data?.data || null);
      setCourses(c.data?.data || []);
    } catch {
      setFailed(true);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const lessonsDone = (courses || []).reduce((n, c) => n + (c.completedVideos?.length || 0), 0);
  const finished = (courses || []).filter((c) => Math.round(c.progressPercentage || 0) >= 100).length;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          {greeting}, {user?.firstName}
        </h1>
        <p className="mt-1 text-muted">Your learning across StudyNotion, in one place.</p>
      </div>

      <div role="tablist" aria-label="Dashboard views" className="flex w-fit gap-1 rounded-xl border border-line bg-surface p-1">
        {[
          ["summary", "Summary"],
          ["courses", "Courses"],
          ["saved", "Saved"],
        ].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-[38px] rounded-lg px-4 text-sm font-semibold transition-colors ${tab === k ? "bg-raised text-ink" : "text-muted hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      {failed ? (
        <div className={`${card} flex flex-wrap items-center justify-between gap-4 border-dashed p-6`}>
          <p className="text-muted">Your dashboard couldn't load. The server may still be waking up.</p>
          <button type="button" onClick={load} className="rounded-xl bg-raised px-4 py-2.5 font-semibold text-ink">
            Try again
          </button>
        </div>
      ) : !courses || !stats ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading your dashboard">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
          <div className="skeleton h-80 rounded-2xl sm:col-span-2 xl:col-span-3" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      ) : tab === "summary" ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ICON.courses} label="Courses" value={courses.length} hint={`${courses.length - finished} in progress`} to="/dashboard/enrolled-courses" />
            <StatCard icon={ICON.lessons} label="Lessons finished" value={lessonsDone} hint="across all courses" to="/dashboard/enrolled-courses" />
            <StatCard icon={ICON.flame} label="Current streak" value={stats.currentStreak} hint={stats.currentStreak === 1 ? "day" : "days"} to="/dashboard/enrolled-courses" />
            <StatCard icon={ICON.award} label="Certificates" value={finished} hint={finished ? "earned" : "finish a course"} to="/dashboard/enrolled-courses" />
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <ActivityChart today={stats.today} history={stats.history || []} />
            <section aria-labelledby="streak-title" className={`${card} flex flex-col gap-3 p-6`}>
              <div>
                <h2 id="streak-title" className="text-2xl font-bold tracking-tight text-ink">
                  Streak
                </h2>
                <p className="mt-1 text-sm text-muted">{stats.learnedToday ? "You've learned today. Nice!" : "A lesson today keeps your streak going."}</p>
              </div>
              {stats.today && <StreakCalendar bare today={stats.today} history={stats.history || []} />}
            </section>
            <ContinueList courses={courses} />
            <GoalCard stats={stats} />
          </div>
        </>
      ) : tab === "courses" ? (
        <ContinueList courses={courses} all />
      ) : (
        <SavedList />
      )}
    </div>
  );
}
