import React from "react";
import { Link } from "react-router-dom";
import GetAvgRating from "../../../utils/avgRating";
import { formatINR } from "../../../utils/formatINR";
import WishlistButton from "../../common/WishlistButton";

/** Course card used on Home and Catalog. `Height` is kept for older callers; the image is always 16:9. */
const CourseCard = ({ course }) => {
  const rating = GetAvgRating(course?.ratingAndReviews);
  const ratingsCount = course?.ratingAndReviews?.length || 0;
  const instructor = [course?.instructor?.firstName, course?.instructor?.lastName].filter(Boolean).join(" ");

  return (
    <div className="relative h-full">
    <Link
      to={`/courses/${course._id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-richblack-600 hover:bg-raised"
    >
      <div className="aspect-video w-full overflow-hidden bg-raised">
        <img
          src={course?.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-lg font-bold leading-snug text-ink">{course?.courseName}</h3>
        {instructor && <p className="text-sm text-muted">{instructor}</p>}
        <p className="flex items-center gap-1.5 text-sm text-muted">
          {ratingsCount > 0 ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="fill-accent">
                <path d="M12 2l3 7 7.5.6-5.7 4.9 1.8 7.5L12 18l-6.6 4 1.8-7.5L1.5 9.6 9 9z" />
              </svg>
              <span className="font-semibold text-ink">{rating.toFixed(1)}</span>
              <span>
                ({ratingsCount} {ratingsCount === 1 ? "rating" : "ratings"})
              </span>
            </>
          ) : (
            <span>No ratings yet</span>
          )}
        </p>
        <p className="mt-auto pt-2 text-lg font-bold text-accent-text">{formatINR(course?.price)}</p>
      </div>
    </Link>
      {/* Sibling of the link (not inside it), so it's its own button for screen readers and keyboards */}
      <div className="absolute right-3 top-3">
        <WishlistButton courseId={course._id} courseName={course.courseName} />
      </div>
    </div>
  );
};

export default CourseCard;
