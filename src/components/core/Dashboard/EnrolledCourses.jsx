import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { apiConnector } from "../../../services/apiconnector";
import { profileEndpoints } from "../../../services/apis";
import { Button, EmptyState, buttonClass } from "../../ui";
import { formatClock, getLastLesson, getPosition } from "../../../utils/learningMemory";

/** First lesson not yet completed (or the first lesson, for a finished course). */
const nextLesson = (course) => {
  const done = new Set(course.completedVideos || []);
  let first = null;
  for (const section of course.courseContent || []) {
    for (const sub of section.subSection || []) {
      const ref = { section, sub };
      if (!first) first = ref;
      if (!done.has(String(sub._id))) return ref;
    }
  }
  return first;
};

const lessonHref = (course, ref) =>
  ref ? `/view-course/${course._id}/section/${ref.section._id}/sub-section/${ref.sub._id}` : null;

const countLessons = (course) => (course.courseContent || []).reduce((n, s) => n + (s.subSection?.length || 0), 0);

function Progress({ value, label }) {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label} className="h-1.5 w-full rounded-full bg-line">
      <div className={`h-full rounded-full ${v >= 100 ? "bg-success" : "bg-accent"}`} style={{ width: `${v}%` }} />
    </div>
  );
}

export default function EnrolledCourses() {
  const { token } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.profile);
  const [courses, setCourses] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setCourses(null);
    try {
      const res = await apiConnector("GET", profileEndpoints.GET_USER_ENROLLED_COURSES_API, null, { Authorization: `Bearer ${token}` });
      setCourses(res.data?.data || []);
    } catch (error) {
      console.error("Enrolled courses error:", error);
      setFailed(true);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // The lesson to resume: the one last opened on this device, if that course is
  // still in progress; otherwise the next lesson of the most progressed course.
  const resume = useMemo(() => {
    const list = courses || [];
    const last = getLastLesson(user?._id);
    if (last) {
      const course = list.find((c) => String(c._id) === String(last.courseId));
      const section = course?.courseContent?.find((s) => String(s._id) === String(last.sectionId));
      const sub = section?.subSection?.find((x) => String(x._id) === String(last.subSectionId));
      if (course && sub && (course.progressPercentage || 0) < 100) {
        return { course, ref: { section, sub }, position: getPosition(user?._id, sub._id) };
      }
    }
    const inProgress = list.filter((c) => (c.progressPercentage || 0) < 100 && countLessons(c) > 0);
    inProgress.sort((a, b) => (b.progressPercentage || 0) - (a.progressPercentage || 0));
    const course = inProgress[0];
    if (!course) return null;
    const ref = nextLesson(course);
    return { course, ref, position: ref ? getPosition(user?._id, ref.sub._id) : 0 };
  }, [courses, user?._id]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-3xl font-bold text-ink">
        {user?.firstName ? `Welcome back, ${user.firstName}` : "My learning"}
      </h1>

      {failed ? (
        <EmptyState title="Your courses couldn't load" action={<Button variant="secondary" onClick={load}>Try again</Button>}>
          The server may still be waking up. This usually takes under a minute.
        </EmptyState>
      ) : courses === null ? (
        <div className="flex flex-col gap-6" role="status" aria-label="Loading your courses">
          <div className="skeleton h-40 w-full rounded-2xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : courses.length === 0 ? (
        <EmptyState title="You haven't enrolled in a course yet" action={<Link to="/" className={buttonClass("primary")}>Browse courses</Link>}>
          Courses you buy appear here, with your progress and the next lesson ready to play.
        </EmptyState>
      ) : (
        <>
          {resume && (
            <section aria-labelledby="ml-resume" className="flex flex-wrap items-center gap-6 rounded-[20px] border border-line bg-surface p-5">
              <img src={resume.course.thumbnail} alt="" className="aspect-video w-full max-w-[280px] rounded-xl object-cover" />
              <div className="flex min-w-[220px] flex-1 flex-col gap-2">
                <h2 id="ml-resume" className="text-sm font-semibold text-muted">
                  Pick up where you left off
                </h2>
                <p className="font-display text-xl font-medium text-ink">{resume.ref?.sub?.title || resume.course.courseName}</p>
                <p className="text-muted">
                  {resume.course.courseName} · {Math.round(resume.course.progressPercentage || 0)}% complete
                  {resume.position >= 3 && <> · Resume at {formatClock(resume.position)}</>}
                </p>
                <Progress value={resume.course.progressPercentage} label={`${resume.course.courseName} progress`} />
              </div>
              <Link to={lessonHref(resume.course, resume.ref)} className={buttonClass("primary", "lg")}>
                Resume
              </Link>
            </section>
          )}

          <section aria-labelledby="ml-all">
            <h2 id="ml-all" className="mb-4 font-display text-xl font-medium text-ink">
              Your courses ({courses.length})
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const pct = Math.round(course.progressPercentage || 0);
                const lessons = countLessons(course);
                const done = Math.round((pct / 100) * lessons);
                const href = lessonHref(course, nextLesson(course));
                const body = (
                  <>
                    <img src={course.thumbnail} alt="" className="aspect-video w-full rounded-xl object-cover" />
                    <span className="font-bold text-ink">{course.courseName}</span>
                    <span className={`flex justify-between text-sm ${pct >= 100 ? "font-semibold text-success" : "text-muted"}`}>
                      <span>{pct >= 100 ? "Completed" : lessons ? `${done} of ${lessons} lessons` : "No lessons yet"}</span>
                      <span>{pct}%</span>
                    </span>
                    <Progress value={pct} label={`${course.courseName} progress`} />
                    {course.totalDuration && <span className="text-sm text-muted">{course.totalDuration} total</span>}
                  </>
                );
                return (
                  <li key={course._id} className="flex flex-col gap-2">
                    {href ? (
                      <Link to={href} className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:bg-raised">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4">{body}</div>
                    )}
                    {pct >= 100 && lessons > 0 && (
                      <Link to={`/dashboard/certificate/${course._id}`} className={buttonClass("secondary", "sm")}>
                        View certificate
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
