import React, { useState } from "react";

import CourseReviewModal from "../ViewCourse/CourseReviewModal";

const Star = ({ filled, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={filled ? "fill-accent" : "fill-line"}>
    <path d="M12 2l3 7 7.5.6-5.7 4.9 1.8 7.5L12 18l-6.6 4 1.8-7.5L1.5 9.6 9 9z" />
  </svg>
);

/**
 * Asks a learner who finished a course to rate it. Tapping a star opens the review
 * dialog with that rating chosen. Once rated, shows a short thank-you instead.
 * `compact` is the one-line version for course cards.
 */
export default function RatePrompt({ course, myRating, onRated, compact = false }) {
  const [rating, setRating] = useState(myRating || 0);
  const [picked, setPicked] = useState(0);
  const [hover, setHover] = useState(0);

  const stars = (size) => (
    <div className="flex items-center" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setPicked(n)}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          aria-label={`Rate ${n} ${n === 1 ? "star" : "stars"}`}
          className="rounded-lg p-1 hover:bg-raised"
        >
          <Star filled={n <= hover} size={size} />
        </button>
      ))}
    </div>
  );

  const modal = picked > 0 && (
    <CourseReviewModal
      course={course}
      initialRating={picked}
      onClose={() => setPicked(0)}
      onReviewed={(value) => {
        setRating(value);
        onRated?.(value);
      }}
    />
  );

  if (rating) {
    return (
      <p className={`flex items-center gap-2 text-sm text-muted ${compact ? "" : "rounded-2xl border border-line bg-surface p-4"}`}>
        <span className="flex" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} filled={n <= rating} size={14} />
          ))}
        </span>
        <span>You rated this course {rating} out of 5. Thanks!</span>
      </p>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-1 rounded-xl border border-line bg-surface px-3 py-1.5">
        <span className="text-sm font-semibold text-ink">Rate this course</span>
        {stars(20)}
        {modal}
      </div>
    );
  }

  return (
    <section aria-label="Rate this course" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 print:hidden">
      <div>
        <h2 className="font-display text-lg font-medium text-ink">How was {course.courseName}?</h2>
        <p className="mt-1 text-sm text-muted">Your rating helps other learners choose, and tells the instructor what worked.</p>
      </div>
      {stars(32)}
      {modal}
    </section>
  );
}
