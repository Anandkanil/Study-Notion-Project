import React, { useEffect, useId, useRef, useState } from "react";

import { apiConnector } from "../../../services/apiconnector";
import { courseEndpoints } from "../../../services/apis";
import { Button } from "../../ui";

/** Plays a course's free first lesson in a dialog. Escape or the backdrop closes it. */
export default function PreviewModal({ courseId, onClose, cta }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let alive = true;
    apiConnector("GET", `${courseEndpoints.COURSE_PREVIEW_API}/${courseId}`)
      .then((res) => alive && setState({ status: "ready", lesson: res.data?.data }))
      .catch((error) => alive && setState({ status: "failed", message: error.response?.data?.message }));
    return () => {
      alive = false;
    };
  }, [courseId]);

  useEffect(() => {
    const last = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      last?.focus?.();
    };
  }, [onClose]);

  const lesson = state.lesson;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]">
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-accent-text">Free preview</p>
            <h2 id={titleId} className="truncate font-display text-xl font-medium text-ink">
              {lesson?.title || "Course preview"}
            </h2>
            {lesson?.sectionName && <p className="text-sm text-muted">{lesson.sectionName}</p>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close preview" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-raised hover:text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="aspect-video w-full bg-black">
          {state.status === "loading" && <div role="status" aria-label="Loading preview" className="skeleton h-full w-full rounded-none" />}
          {state.status === "failed" && (
            <p className="grid h-full place-items-center p-6 text-center text-white/80">{state.message || "The preview couldn't load. Please try again."}</p>
          )}
          {state.status === "ready" && lesson && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={lesson.videoUrl} controls autoPlay playsInline controlsList="nodownload" className="h-full w-full" />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-muted">Like it? The rest of the course unlocks when you enrol.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {cta}
          </div>
        </div>
      </div>
    </div>
  );
}
