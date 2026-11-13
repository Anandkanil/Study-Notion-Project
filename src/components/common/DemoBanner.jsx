import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../services/operations/authAPI";

/** Shown at the top of every page while someone is using a read-only demo account. */
export default function DemoBanner() {
  const { user } = useSelector((state) => state.profile);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  if (!user?.demo) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-line bg-raised px-4 py-2 text-center text-sm text-ink">
      <span>
        You're exploring a read-only {user.accountType?.toLowerCase()} demo. Changes aren't saved.
      </span>
      <span className="flex items-center gap-3">
        <Link to="/signup" onClick={() => dispatch(logout(() => {}))} className="font-semibold text-accent-text underline-offset-4 hover:underline">
          Create a free account
        </Link>
        <button type="button" onClick={() => dispatch(logout(navigate))} className="font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
          Exit demo
        </button>
      </span>
    </div>
  );
}
