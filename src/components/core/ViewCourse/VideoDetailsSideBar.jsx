import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, NavLink, useParams } from "react-router-dom";

export default function VideoDetailsSidebar({ setReviewModal }) {
  const { courseId, sectionId, subSectionId } = useParams();
  const { courseSectionData, courseEntireData, totalNoOfLectures, completedLectures } = useSelector((state) => state.viewCourse);
  const [open, setOpen] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);

  // Keep the current section expanded
  useEffect(() => {
    if (sectionId) setOpen((o) => ({ ...o, [sectionId]: true }));
    setMobileOpen(false);
  }, [sectionId, subSectionId]);

  const done = new Set((completedLectures || []).map(String));
  const pct = totalNoOfLectures ? Math.round((done.size / totalNoOfLectures) * 100) : 0;

  return (
    <aside className="border-b border-line bg-surface lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:w-80 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <Link to="/dashboard/enrolled-courses" className="w-fit text-sm font-semibold text-muted hover:text-ink">
          ← My learning
        </Link>
        <p className="font-display text-lg font-medium leading-snug text-ink">{courseEntireData?.courseName}</p>
        <div>
          <div className="flex justify-between text-sm text-muted">
            <span>
              {done.size} of {totalNoOfLectures} lessons
            </span>
            <span>{pct}%</span>
          </div>
          <div role="progressbar" aria-label="Course progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-1.5 h-1.5 rounded-full bg-line">
            <div className={`h-full rounded-full ${pct >= 100 ? "bg-success" : "bg-accent"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setReviewModal(true)} className="rounded-lg border border-richblack-600 px-3 py-2 text-sm font-semibold text-ink hover:bg-raised">
            Rate this course
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-controls="lesson-list"
            className="rounded-lg border border-richblack-600 px-3 py-2 text-sm font-semibold text-ink hover:bg-raised lg:hidden"
          >
            {mobileOpen ? "Hide lessons" : "All lessons"}
          </button>
        </div>
      </div>

      <nav id="lesson-list" aria-label="Lessons" className={`${mobileOpen ? "block" : "hidden"} max-h-[60vh] overflow-y-auto lg:block lg:max-h-none lg:flex-1`}>
        {(courseSectionData || []).map((section) => {
          const isOpen = !!open[section._id];
          const sectionDone = section.subSection.filter((s) => done.has(String(s._id))).length;
          return (
            <div key={section._id} className="border-b border-line">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen((o) => ({ ...o, [section._id]: !isOpen }))}
                className="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold text-ink hover:bg-raised"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-90" : ""}`}>
                  <path d="M9 6l6 6-6 6" />
                </svg>
                <span className="flex-1">{section.sectionName}</span>
                <span className="text-xs font-medium text-muted">
                  {sectionDone}/{section.subSection.length}
                </span>
              </button>
              {isOpen && (
                <ul>
                  {section.subSection.map((lesson) => {
                    const isDone = done.has(String(lesson._id));
                    return (
                      <li key={lesson._id}>
                        <NavLink
                          to={`/view-course/${courseId}/section/${section._id}/sub-section/${lesson._id}`}
                          className={({ isActive }) =>
                            `flex items-start gap-3 py-2.5 pl-10 pr-4 text-sm ${isActive ? "bg-accent/15 font-semibold text-ink" : "text-muted hover:bg-raised hover:text-ink"}`
                          }
                        >
                          <span aria-hidden="true" className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${isDone ? "bg-success" : "border border-field"}`}>
                            {isDone && (
                              <svg width="10" height="10" viewBox="0 0 24 24">
                                <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="rgb(var(--bg))" strokeWidth="4" strokeLinecap="round" />
                              </svg>
                            )}
                          </span>
                          <span>
                            {lesson.title}
                            {isDone && <span className="sr-only"> (completed)</span>}
                          </span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
