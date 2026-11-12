import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import { toggleWishlist } from "../../slices/wishlistSlice";

/**
 * Heart toggle to save a course for later. Students only; logged-out visitors are sent
 * to log in (and come back here). Hidden for instructors and admins.
 * variant "overlay" sits on a card image; "inline" is a full-width secondary button.
 */
export default function WishlistButton({ courseId, courseName, variant = "overlay" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useSelector((s) => s.auth);
  const { user } = useSelector((s) => s.profile);
  const saved = useSelector((s) => s.wishlist.ids.includes(String(courseId)));

  if (user && user.accountType !== "Student") return null;

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return navigate("/login", { state: { from: location.pathname } });
    dispatch(toggleWishlist(courseId, token));
  };

  const heart = (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className={saved ? "fill-danger stroke-danger" : "fill-none stroke-current"} strokeWidth="2" strokeLinejoin="round">
      <path d="M12 20s-7-4.4-9.2-8.6C1.2 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.1 1.8-1.9 3.3-3.1 5.4-3.1 3.6 0 5.4 3.8 3.8 6.9C19 15.6 12 20 12 20z" />
    </svg>
  );
  const label = saved ? `Remove ${courseName || "course"} from wishlist` : `Save ${courseName || "course"} to wishlist`;

  if (variant === "inline") {
    return (
      <button type="button" onClick={onClick} aria-pressed={saved} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line px-4 font-bold text-ink transition-colors hover:bg-raised">
        {heart}
        {saved ? "Saved to wishlist" : "Save for later"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "Saved — tap to remove" : "Save for later"}
      className="grid h-10 w-10 place-items-center rounded-full bg-bg/80 text-ink shadow backdrop-blur transition-transform hover:scale-105"
    >
      {heart}
    </button>
  );
}
