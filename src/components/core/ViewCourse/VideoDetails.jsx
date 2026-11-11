import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";

import { markLectureAsComplete } from "../../../services/operations/courseDetailsAPI";
import { updateCompletedLectures } from "../../../slices/viewCourseSlice";
import { Button, buttonClass } from "../../ui";
import { formatClock, getPosition, setLastLesson, setPosition } from "../../../utils/learningMemory";

const VideoDetails = () => {
  const { courseId, sectionId, subSectionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.profile);
  const videoRef = useRef(null);
  const lastSaved = useRef(0);
  const [resumedAt, setResumedAt] = useState(0);
  const { courseSectionData, courseEntireData, completedLectures } = useSelector((state) => state.viewCourse);
  const [saving, setSaving] = useState(false);
  const [ended, setEnded] = useState(false);

  // Flat, ordered list of every lesson, for previous/next
  const lessons = useMemo(
    () => (courseSectionData || []).flatMap((s) => (s.subSection || []).map((sub) => ({ sectionId: s._id, sectionName: s.sectionName, sub }))),
    [courseSectionData]
  );
  const index = lessons.findIndex((l) => l.sectionId === sectionId && l.sub._id === subSectionId);
  const current = lessons[index];
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const href = (l) => `/view-course/${courseId}/section/${l.sectionId}/sub-section/${l.sub._id}`;
  const doneIds = (completedLectures || []).map(String);
  const isDone = doneIds.includes(String(subSectionId));
  const courseFinished = lessons.length > 0 && lessons.every((l) => doneIds.includes(String(l.sub._id)));

  // Remember this lesson so "Resume" brings the learner straight back here
  useEffect(() => {
    if (!current || !user?._id) return;
    setResumedAt(0);
    lastSaved.current = 0;
    setLastLesson(user._id, {
      courseId,
      sectionId,
      subSectionId,
      lessonTitle: current.sub.title,
      courseName: courseEntireData?.courseName,
      thumbnail: courseEntireData?.thumbnail,
    });
  }, [current, user?._id, courseId, sectionId, subSectionId, courseEntireData?.courseName, courseEntireData?.thumbnail]);

  const savePosition = (force = false) => {
    const v = videoRef.current;
    if (!v || !user?._id) return;
    if (!force && Math.abs(v.currentTime - lastSaved.current) < 5) return;
    lastSaved.current = v.currentTime;
    // Near the end counts as watched: start from the beginning next time
    setPosition(user._id, subSectionId, v.duration && v.currentTime > v.duration - 10 ? 0 : v.currentTime);
  };

  const restoreAndMaybeResume = () => {
    const v = videoRef.current;
    if (!v || !user?._id) return;
    const saved = getPosition(user._id, subSectionId);
    if (saved > 5 && (!v.duration || saved < v.duration - 10)) {
      v.currentTime = saved;
      lastSaved.current = saved;
      setResumedAt(saved);
    }
  };

  const startOver = () => {
    const v = videoRef.current;
    if (v) v.currentTime = 0;
    setResumedAt(0);
    if (user?._id) setPosition(user._id, subSectionId, 0);
  };

  const markComplete = async () => {
    if (isDone) return true;
    setSaving(true);
    const ok = await markLectureAsComplete({ courseId, subsectionId: subSectionId }, token);
    if (ok) {
      dispatch(updateCompletedLectures(subSectionId));
      const nowDone = new Set([...doneIds, String(subSectionId)]);
      if (lessons.length && lessons.every((l) => nowDone.has(String(l.sub._id)))) {
        toast.success("Course complete! Your certificate is ready.", { id: "course-complete" });
      }
    }
    setSaving(false);
    return ok;
  };

  const completeAndContinue = async () => {
    const ok = await markComplete();
    if (ok && next) navigate(href(next));
  };

  if (!current) {
    return (
      <div className="flex flex-col items-start gap-4">
        {courseEntireData?.thumbnail && <img src={courseEntireData.thumbnail} alt="" className="aspect-video w-full rounded-2xl object-cover" />}
        <h1 className="font-display text-2xl font-medium text-ink">{lessons.length ? "Choose a lesson to start" : "No lessons yet"}</h1>
        {lessons[0] && (
          <Link to={href(lessons[0])} className={buttonClass("primary")}>
            Start the first lesson
          </Link>
        )}
      </div>
    );
  }

  return (
    <article className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-[rgb(8_10_24)]">
        <video
          key={current.sub._id}
          ref={videoRef}
          src={current.sub.videoUrl}
          poster={courseEntireData?.thumbnail}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={restoreAndMaybeResume}
          onTimeUpdate={() => savePosition()}
          onPause={() => savePosition(true)}
          onEnded={() => {
            setEnded(true);
            if (user?._id) setPosition(user._id, subSectionId, 0);
            markComplete();
          }}
          onPlay={() => setEnded(false)}
          className="aspect-video w-full bg-black"
        >
          Your browser can't play this video.
        </video>
        {ended && next && (
          <div className="absolute inset-0 grid place-items-center bg-[rgb(8_10_24/0.8)] p-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-semibold text-[#A9A8C8]">Up next</p>
              <p className="font-display text-xl font-medium text-[#ECEAF7]">{next.sub.title}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to={href(next)} className={buttonClass("primary")}>
                  Play next lesson
                </Link>
                <button type="button" onClick={() => setEnded(false)} className="rounded-xl border border-[#3B437A] px-5 py-3 font-bold text-[#ECEAF7] hover:bg-[#262C57]">
                  Stay here
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {resumedAt > 0 && (
        <p role="status" className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span>Resumed at {formatClock(resumedAt)}, where you stopped last time.</span>
          <button type="button" onClick={startOver} className="font-semibold text-accent-text underline-offset-4 hover:underline">
            Start from the beginning
          </button>
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted">
            {current.sectionName} · Lesson {index + 1} of {lessons.length}
          </p>
          <h1 className="mt-1 font-display text-2xl font-medium text-ink">{current.sub.title}</h1>
        </div>
        {isDone ? (
          <span className="inline-flex items-center gap-2 rounded-xl bg-success/15 px-4 py-2.5 font-semibold text-success">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Completed
          </span>
        ) : (
          <Button variant="secondary" onClick={markComplete} loading={saving} loadingText="Saving…">
            Mark as complete
          </Button>
        )}
      </div>

      {current.sub.description && <p className="max-w-prose whitespace-pre-line text-ink">{current.sub.description}</p>}

      <nav aria-label="Lesson navigation" className="flex flex-wrap justify-between gap-3 border-t border-line pt-5">
        {prev ? (
          <Link to={href(prev)} className={buttonClass("ghost")}>
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Button onClick={completeAndContinue} loading={saving} loadingText="Saving…">
            {isDone ? "Next lesson →" : "Complete and continue →"}
          </Button>
        ) : (
          !isDone ? (
            <Button onClick={markComplete} loading={saving} loadingText="Saving…">
              Finish the course
            </Button>
          ) : courseFinished ? (
            <Link to={`/dashboard/certificate/${courseId}`} className={buttonClass("primary")}>
              Get your certificate
            </Link>
          ) : (
            <Link to="/dashboard/enrolled-courses" className={buttonClass("secondary")}>
              Back to My learning
            </Link>
          )
        )}
      </nav>
    </article>
  );
};

export default VideoDetails;
