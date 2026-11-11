import React, { useEffect, useState } from "react";
import { apiConnector } from "../../services/apiconnector";
import { ratingsEndpoints } from "../../services/apis";

const MAX_WORDS = 40;
const shorten = (text = "") => {
  const words = text.trim().split(/\s+/);
  return words.length > MAX_WORDS ? `${words.slice(0, MAX_WORDS).join(" ")}…` : text;
};

function Stars({ value }) {
  const full = Math.round(value);
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className={n <= full ? "fill-accent" : "fill-line"}>
          <path d="M12 2l3 7 7.5.6-5.7 4.9 1.8 7.5L12 18l-6.6 4 1.8-7.5L1.5 9.6 9 9z" />
        </svg>
      ))}
    </span>
  );
}

/** Learner reviews from the API. Shows nothing until there is something real to show. */
function ReviewSlider() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await apiConnector("GET", ratingsEndpoints.REVIEWS_DETAILS_API);
        if (alive && data?.success) {
          // One review per person and course, with text
          const seen = new Set();
          const unique = (data.ratingsAndReviews || []).filter((r) => {
            const key = `${r?.user?._id}-${r?.course?._id}`;
            if (!r?.review?.trim() || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setReviews(unique.slice(0, 6));
        }
      } catch {
        /* reviews are optional: hide the section */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!reviews.length) return null;

  return (
    <section aria-labelledby="reviews-title" className="mx-auto w-full max-w-6xl px-6 py-12">
      <h2 id="reviews-title" className="font-display text-2xl font-medium text-ink">
        What learners say
      </h2>
      <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => {
          const name = [review?.user?.firstName, review?.user?.lastName].filter(Boolean).join(" ") || "A learner";
          return (
            <li key={review._id} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
              <Stars value={review.rating} />
              <blockquote className="m-0 text-ink">“{shorten(review.review)}”</blockquote>
              <div className="mt-auto flex items-center gap-3">
                <img
                  src={review?.user?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{name}</p>
                  {review?.course?.courseName && <p className="truncate text-sm text-muted">{review.course.courseName}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default ReviewSlider;
