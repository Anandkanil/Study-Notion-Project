import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { apiConnector } from "../../../../services/apiconnector";
import { courseEndpoints, profileEndpoints } from "../../../../services/apis";
import { formatINR } from "../../../../utils/formatINR";
import { Button, EmptyState, buttonClass } from "../../../ui";

const METRICS = [
  ["students", "Students", "totalStudentsEnrolled", (v) => v.toLocaleString("en-IN")],
  ["income", "Income", "totalAmountGenerated", (v) => formatINR(v) || "₹0"],
];

const Stat = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-line bg-surface p-5">
    <p className="text-sm font-semibold text-muted">{label}</p>
    <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
    {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
  </div>
);

const Instructor = () => {
  const { token } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.profile);
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState(null);
  const [failed, setFailed] = useState(false);
  const [metric, setMetric] = useState("students");

  const load = useCallback(async () => {
    setFailed(false);
    setStats(null);
    setCourses(null);
    const auth = { Authorization: `Bearer ${token}` };
    try {
      const [s, c] = await Promise.all([
        apiConnector("GET", profileEndpoints.GET_INSTRUCTOR_DATA_API, null, auth),
        apiConnector("GET", courseEndpoints.GET_ALL_INSTRUCTOR_COURSES_API, null, auth),
      ]);
      setStats(s.data?.courses || s.data?.data || []);
      setCourses(c.data?.data || []);
    } catch (error) {
      console.error("Instructor dashboard error:", error);
      setFailed(true);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const list = stats || [];
    return {
      students: list.reduce((n, c) => n + (c.totalStudentsEnrolled || 0), 0),
      income: list.reduce((n, c) => n + (c.totalAmountGenerated || 0), 0),
    };
  }, [stats]);

  const [, metricLabel, metricKey, metricFmt] = METRICS.find(([k]) => k === metric);
  const bars = useMemo(() => [...(stats || [])].sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0)), [stats, metricKey]);
  const max = Math.max(1, ...bars.map((c) => c[metricKey] || 0));
  const published = (courses || []).filter((c) => c.status === "Published").length;
  const drafts = (courses || []).length - published;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Hi {user?.firstName}</h1>
          <p className="mt-1 text-muted">Here's how your courses are doing.</p>
        </div>
        <Link to="/dashboard/add-course" className={buttonClass("primary")}>
          New course
        </Link>
      </div>

      {failed ? (
        <EmptyState title="Your dashboard couldn't load" action={<Button variant="secondary" onClick={load}>Try again</Button>}>
          The server may still be waking up. This usually takes under a minute.
        </EmptyState>
      ) : courses === null ? (
        <div className="grid gap-4 sm:grid-cols-3" role="status" aria-label="Loading your dashboard">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState title="Create your first course" action={<Link to="/dashboard/add-course" className={buttonClass("primary")}>Start a course</Link>}>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Add the basics: title, description, price and a thumbnail.</li>
            <li>Build sections and upload a video for each lesson.</li>
            <li>Publish it, and it appears in the catalog for learners to buy.</li>
          </ol>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Courses" value={courses.length} hint={`${published} published · ${drafts} ${drafts === 1 ? "draft" : "drafts"}`} />
            <Stat label="Students" value={totals.students.toLocaleString("en-IN")} hint="Across all courses" />
            <Stat label="Income" value={formatINR(totals.income) || "₹0"} hint="Before payment fees" />
          </div>

          <section aria-labelledby="in-by-course" className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="in-by-course" className="font-semibold text-ink">
                {metricLabel} by course
              </h2>
              <div role="radiogroup" aria-label="Show" className="flex gap-1 rounded-xl border border-line bg-bg p-1">
                {METRICS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={metric === key}
                    onClick={() => setMetric(key)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${metric === key ? "bg-accent text-on-accent" : "text-muted hover:text-ink"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {totals[metric] === 0 ? (
              <p className="mt-5 text-muted">No {metric === "income" ? "income" : "enrolments"} yet. Numbers appear here after your first sale.</p>
            ) : (
              <ul className="mt-5 flex flex-col gap-4">
                {bars.map((c) => {
                  const v = c[metricKey] || 0;
                  return (
                    <li key={c._id} className="grid gap-1.5 sm:grid-cols-[minmax(0,240px)_1fr_auto] sm:items-center sm:gap-4">
                      <span className="truncate text-ink">{c.courseName}</span>
                      <span className="h-2.5 rounded-full bg-line" aria-hidden="true">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${(v / max) * 100}%` }} />
                      </span>
                      <span className="font-semibold text-ink sm:text-right">{metricFmt(v)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="in-courses">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="in-courses" className="font-semibold text-ink">
                Your courses
              </h2>
              <Link to="/dashboard/my-courses" className="font-semibold text-accent-text hover:underline">
                Manage all
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 3).map((c) => (
                <li key={c._id}>
                  <Link to={`/dashboard/edit-course/${c._id}`} className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-4 hover:bg-raised">
                    <img src={c.thumbnail} alt="" className="aspect-video w-full rounded-xl object-cover" />
                    <span className="font-bold text-ink">{c.courseName}</span>
                    <span className="text-sm text-muted">
                      {c.status === "Published" ? "Published" : "Draft"} · {c.studentsEnrolled?.length || 0} students · {formatINR(c.price)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
};

export default Instructor;
