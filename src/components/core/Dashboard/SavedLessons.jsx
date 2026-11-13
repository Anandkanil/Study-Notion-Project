import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { loadSavedLessons, toggleSavedLesson } from "../../../slices/savedLessonsSlice";
import { EmptyState, buttonClass } from "../../ui";

const savedOn = (at) => new Date(at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Lessons the student bookmarked from the player, grouped by course. */
export default function SavedLessons() {
  const dispatch = useDispatch();
  const { token } = useSelector((s) => s.auth);
  const { list, loaded } = useSelector((s) => s.savedLessons);
  const [refreshed, setRefreshed] = useState(false);

  // Refresh once on open so titles and deleted lessons are up to date
  useEffect(() => {
    dispatch(loadSavedLessons(token)).finally(() => setRefreshed(true));
  }, [dispatch, token]);

  const groups = list.reduce((acc, l) => {
    (acc[l.courseId] ||= { courseName: l.courseName, thumbnail: l.thumbnail, items: [] }).items.push(l);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Saved lessons</h1>
        <p className="mt-1 text-muted">Lessons you bookmarked to watch again. Save one with the bookmark button above any video.</p>
      </div>

      {!loaded && !refreshed ? (
        <div className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="No saved lessons yet" action={<Link to="/dashboard/enrolled-courses" className={buttonClass("primary")}>Go to your courses</Link>}>
          While watching, press the bookmark button next to the lesson title. It'll show up here.
        </EmptyState>
      ) : (
        Object.entries(groups).map(([courseId, g]) => (
          <section key={courseId} aria-label={g.courseName} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-3 text-lg font-bold text-ink">
              {g.thumbnail && <img src={g.thumbnail} alt="" className="h-9 w-14 rounded-md object-cover" />}
              {g.courseName || "Course"}
            </h2>
            <ul className="flex flex-col gap-2">
              {g.items.map((l) => (
                <li key={l.subSectionId} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 pl-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="shrink-0 text-accent-text">
                    <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM10 9l5 3-5 3z" />
                  </svg>
                  <Link to={`/view-course/${l.courseId}/section/${l.sectionId}/sub-section/${l.subSectionId}`} className="min-w-0 flex-1 font-semibold text-ink hover:text-accent-text">
                    <span className="block truncate">{l.title}</span>
                    <span className="text-sm font-normal text-muted">Saved {savedOn(l.at)}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => dispatch(toggleSavedLesson(l, token))}
                    aria-label={`Remove ${l.title} from saved lessons`}
                    className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
