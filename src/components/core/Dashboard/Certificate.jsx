import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";

import { apiConnector } from "../../../services/apiconnector";
import { courseEndpoints, profileEndpoints } from "../../../services/apis";
import { getCertificateDate } from "../../../utils/learningMemory";
import { Button, EmptyState, buttonClass } from "../../ui";
import RatePrompt from "./RatePrompt";

/** Short, stable reference for a learner + course pair, e.g. "SN-4K7Q-2M9X". */
const certificateId = (userId, courseId) => {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (const ch of `${userId}:${courseId}`) {
    h1 = Math.imul(h1 ^ ch.charCodeAt(0), 16777619) >>> 0;
    h2 = Math.imul(h2 + ch.charCodeAt(0), 2246822519) >>> 0;
  }
  const code = (h1.toString(36) + h2.toString(36)).toUpperCase().padEnd(8, "0").slice(0, 8);
  return `SN-${code.slice(0, 4)}-${code.slice(4)}`;
};

const countLessons = (course) => (course?.courseContent || []).reduce((n, s) => n + (s.subSection?.length || 0), 0);

export default function Certificate() {
  const { courseId } = useParams();
  const { token } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.profile);
  const [state, setState] = useState({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const auth = { Authorization: `Bearer ${token}` };
      const [enrolled, details] = await Promise.all([
        apiConnector("GET", profileEndpoints.GET_USER_ENROLLED_COURSES_API, null, auth),
        apiConnector("POST", courseEndpoints.COURSE_DETAILS_API, { courseId }),
      ]);
      const course = (enrolled.data?.data || []).find((c) => String(c._id) === String(courseId));
      if (!course) return setState({ status: "not-enrolled" });
      const info = details.data?.data || {};
      setState({ status: "ready", course, instructor: info.courseDetails?.instructor, totalDuration: info.totalDuration || course.totalDuration });
    } catch (error) {
      console.error("Certificate error:", error);
      setState({ status: "failed" });
    }
  }, [courseId, token]);

  useEffect(() => {
    load();
  }, [load]);

  const { course } = state;
  const finished = course && countLessons(course) > 0 && (course.progressPercentage || 0) >= 100;
  const learner = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const teacher = [state.instructor?.firstName, state.instructor?.lastName].filter(Boolean).join(" ");
  const issued = useMemo(
    () => (finished ? getCertificateDate(user?._id, courseId) : null),
    [finished, user?._id, courseId]
  );

  useEffect(() => {
    if (finished && course?.courseName) document.title = `Certificate · ${course.courseName} · StudyNotion`;
  }, [finished, course?.courseName]);

  if (state.status === "loading") {
    return (
      <div role="status" aria-label="Loading your certificate" className="flex flex-col gap-4">
        <div className="skeleton h-9 w-64" />
        <div className="skeleton aspect-[1.414] w-full max-w-4xl rounded-2xl" />
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <EmptyState title="Your certificate couldn't load" action={<Button variant="secondary" onClick={load}>Try again</Button>}>
        The server may still be waking up. This usually takes under a minute.
      </EmptyState>
    );
  }

  if (state.status === "not-enrolled") {
    return (
      <EmptyState title="No certificate for this course" action={<Link to="/dashboard/enrolled-courses" className={buttonClass("primary")}>Go to My learning</Link>}>
        Certificates are for courses you're enrolled in and have finished.
      </EmptyState>
    );
  }

  if (!finished) {
    const pct = Math.round(course.progressPercentage || 0);
    return (
      <EmptyState
        title="Finish the course to get your certificate"
        action={<Link to="/dashboard/enrolled-courses" className={buttonClass("primary")}>Continue learning</Link>}
      >
        You've completed {pct}% of {course.courseName}. Mark every lesson as complete and your certificate appears here.
      </EmptyState>
    );
  }

  const issuedText = issued.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const lessons = countLessons(course);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Your certificate</h1>
          <p className="mt-1 text-muted">Download it as a PDF or print it. In the print window, choose "Save as PDF".</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard/enrolled-courses" className={buttonClass("secondary")}>
            Back to My learning
          </Link>
          <Button onClick={() => window.print()}>Download PDF</Button>
        </div>
      </div>

      <RatePrompt course={course} myRating={course.myRating} />

      {/* Fixed print-friendly colours: the certificate looks the same in light and dark mode */}
      <section
        id="certificate"
        style={{ containerType: "inline-size" }}
        aria-label={`Certificate of completion for ${course.courseName}`}
        className="relative mx-auto aspect-[1.414] w-full max-w-4xl overflow-hidden rounded-2xl bg-white text-[#14172E] shadow-[var(--shadow-pop)] print:max-w-none print:rounded-none print:shadow-none"
      >
        <div className="absolute inset-[3%] rounded-xl border-2 border-[#0F0F0F]" />
        <div className="absolute inset-[4.2%] rounded-lg border border-[#AC84EB]" />

        <div className="relative flex h-full flex-col items-center justify-between px-[9%] py-[8%] text-center">
          <div className="flex items-center gap-2.5">
            <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="#0F0F0F" />
              <path d="M14 20h22a8 8 0 0 1 0 16H28a8 8 0 0 0 0 16h22" fill="none" stroke="#AC84EB" strokeWidth="7" strokeLinecap="round" />
            </svg>
            <span className="font-display text-lg font-semibold tracking-tight">StudyNotion</span>
          </div>

          <div className="flex flex-col items-center gap-[0.6em] text-[clamp(9px,2.1cqw,18px)]">
            <p className="font-display text-[1.6em] font-medium text-[#0F0F0F]">Certificate of completion</p>
            <p className="text-[#4A4F6E]">This certifies that</p>
            <p className="font-display text-[2.6em] font-bold leading-tight">{learner || "StudyNotion learner"}</p>
            <div className="h-[2px] w-1/2 bg-[#AC84EB]" aria-hidden="true" />
            <p className="text-[#4A4F6E]">has completed the course</p>
            <p className="max-w-[90%] font-display text-[1.6em] font-medium leading-snug">{course.courseName}</p>
            <p className="text-[#4A4F6E]">
              {lessons} {lessons === 1 ? "lesson" : "lessons"}
              {state.totalDuration ? ` · ${state.totalDuration} of video` : ""}
              {teacher ? ` · taught by ${teacher}` : ""}
            </p>
          </div>

          <dl className="grid w-full grid-cols-2 gap-4 text-left text-[clamp(8px,1.5cqw,13px)]">
            <div>
              <dt className="text-[#4A4F6E]">Issued on</dt>
              <dd className="font-bold">{issuedText}</dd>
            </div>
            <div className="text-right">
              <dt className="text-[#4A4F6E]">Certificate ID</dt>
              <dd className="font-bold tabular-nums">{certificateId(user?._id, courseId)}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
