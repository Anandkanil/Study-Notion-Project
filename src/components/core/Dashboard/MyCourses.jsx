import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { apiConnector } from "../../../services/apiconnector";
import { courseEndpoints } from "../../../services/apis";
import { deleteCourse } from "../../../services/operations/courseDetailsAPI";
import { formatINR } from "../../../utils/formatINR";
import ConfirmationModal from "../../common/ConfirmationModal";
import { Button, EmptyState, buttonClass } from "../../ui";

const lessonsIn = (c) => (c.courseContent || []).reduce((n, s) => n + (s.subSection?.length || 0), 0);

const FILTERS = [
  ["all", "All"],
  ["Published", "Published"],
  ["Draft", "Drafts"],
];

export default function MyCourses() {
  const { token } = useSelector((state) => state.auth);
  const [courses, setCourses] = useState(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await apiConnector("GET", courseEndpoints.GET_ALL_INSTRUCTOR_COURSES_API, null, { Authorization: `Bearer ${token}` });
      setCourses(res.data?.data || []);
    } catch (error) {
      console.error("My courses error:", error);
      setFailed(true);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const askDelete = (course) => {
    const students = course.studentsEnrolled?.length || 0;
    setConfirm({
      danger: true,
      text1: `Delete "${course.courseName}"?`,
      text2:
        students > 0
          ? `${students} ${students === 1 ? "student is" : "students are"} enrolled and will lose access. Its sections and lessons are deleted too. This can't be undone.`
          : "Its sections and lessons are deleted too. This can't be undone.",
      btn1Text: "Delete course",
      btn2Text: "Keep course",
      btn1Handler: async () => {
        setConfirm(null);
        setDeleting(course._id);
        await deleteCourse({ courseId: course._id }, token);
        setDeleting(null);
        load();
      },
      btn2Handler: () => setConfirm(null),
    });
  };

  const shown = (courses || []).filter((c) => filter === "all" || (filter === "Draft" ? c.status !== "Published" : c.status === "Published"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-ink">My courses</h1>
        <Link to="/dashboard/add-course" className={buttonClass("primary")}>
          New course
        </Link>
      </div>

      {failed ? (
        <EmptyState title="Your courses couldn't load" action={<Button variant="secondary" onClick={load}>Try again</Button>}>
          The server may still be waking up. This usually takes under a minute.
        </EmptyState>
      ) : courses === null ? (
        <div className="flex flex-col gap-4" role="status" aria-label="Loading your courses">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState title="No courses yet" action={<Link to="/dashboard/add-course" className={buttonClass("primary")}>Create a course</Link>}>
          Your published courses and drafts will be listed here.
        </EmptyState>
      ) : (
        <>
          <div role="radiogroup" aria-label="Filter courses" className="flex w-fit gap-1 rounded-xl border border-line bg-surface p-1">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={filter === key}
                onClick={() => setFilter(key)}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${filter === key ? "bg-accent text-on-accent" : "text-muted hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <ul className="flex flex-col gap-4">
            {shown.map((c) => {
              const isPublished = c.status === "Published";
              const lessons = lessonsIn(c);
              return (
                <li key={c._id} className="flex flex-wrap gap-5 rounded-2xl border border-line bg-surface p-4 sm:flex-nowrap">
                  <img src={c.thumbnail} alt="" className="aspect-video w-full rounded-xl object-cover sm:w-52" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-ink">{c.courseName}</h2>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${isPublished ? "bg-success/15 text-success" : "bg-raised text-muted"}`}>
                        {isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-muted">{c.courseDescription}</p>
                    <p className="text-sm text-muted">
                      {c.studentsEnrolled?.length || 0} students · {lessons} {lessons === 1 ? "lesson" : "lessons"} · {formatINR(c.price)}
                    </p>
                    {!isPublished && lessons === 0 && <p className="text-sm font-medium text-accent-text">Add at least one lesson, then publish it.</p>}
                  </div>
                  <div className="flex w-full flex-wrap items-start gap-2 sm:w-auto sm:flex-col">
                    <Link to={`/dashboard/instructor/courses/${c._id}`} className={buttonClass("primary", "sm")}>
                      Stats &amp; tools
                    </Link>
                    <Link to={`/dashboard/edit-course/${c._id}`} className={buttonClass("secondary", "sm")}>
                      Edit
                    </Link>
                    {isPublished && (
                      <Link to={`/courses/${c._id}`} className={buttonClass("ghost", "sm")}>
                        View page
                      </Link>
                    )}
                    <Button variant="danger" size="sm" onClick={() => askDelete(c)} loading={deleting === c._id} loadingText="Deleting…">
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
            {shown.length === 0 && <li className="text-muted">No {filter === "Draft" ? "drafts" : "published courses"}.</li>}
          </ul>
        </>
      )}
      {confirm && <ConfirmationModal modalData={confirm} />}
    </div>
  );
}
