import React, { useEffect, useId, useState } from "react";
import { useSelector } from "react-redux";
import { createRating } from "../../../services/operations/courseDetailsAPI";
import { Button, Field } from "../../ui";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export default function CourseReviewModal({ setReviewModal }) {
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  const { courseEntireData } = useSelector((state) => state.viewCourse);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const close = () => setReviewModal(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!rating || !review.trim()) return;
    setSaving(true);
    const ok = await createRating({ courseId: courseEntireData._id, rating, review: review.trim() }, token);
    setSaving(false);
    if (ok !== false) close();
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[rgb(8_10_24/0.6)] p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-pop)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
              Rate this course
            </h2>
            <p className="mt-1 text-sm text-muted">{courseEntireData?.courseName}</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <img src={user?.image} alt="" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <p className="font-semibold text-ink">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-muted">Your name and rating are shown with your review.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5" noValidate>
          <fieldset className="m-0 border-0 p-0">
            <legend className="text-sm font-semibold text-ink">
              Your rating <span className="text-danger" aria-hidden="true">*</span>
            </legend>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer rounded-lg p-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
                  <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
                  <span className="sr-only">
                    {n} {n === 1 ? "star" : "stars"} — {LABELS[n]}
                  </span>
                  <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true" className={n <= rating ? "fill-accent" : "fill-line"}>
                    <path d="M12 2l3 7 7.5.6-5.7 4.9 1.8 7.5L12 18l-6.6 4 1.8-7.5L1.5 9.6 9 9z" />
                  </svg>
                </label>
              ))}
              <span className="ml-2 text-sm font-semibold text-muted" aria-live="polite">
                {LABELS[rating]}
              </span>
            </div>
            {submitted && !rating && <p className="mt-1 text-sm font-medium text-danger">Choose a rating from 1 to 5 stars.</p>}
          </fieldset>

          <Field
            label="Your review"
            as="textarea"
            required
            rows={4}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="What did you learn? Who would you recommend it to?"
            error={submitted && !review.trim() ? "Write a few words about the course." : undefined}
          />

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} loadingText="Saving…">
              Submit review
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
