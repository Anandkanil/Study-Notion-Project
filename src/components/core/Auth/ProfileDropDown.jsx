import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import useOnClickOutside from "../../../hooks/useOnClickOutside";
import { logout } from "../../../services/operations/authAPI";

export default function ProfileDropdown() {
  const { user } = useSelector((state) => state.profile);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useOnClickOutside(ref, () => setOpen(false));
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const home = user?.accountType === "Instructor" ? "/dashboard/instructor" : "/dashboard/enrolled-courses";
  const itemClass =
    "flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-raised focus-visible:bg-raised";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface pl-1.5 pr-3 hover:bg-raised"
      >
        <img src={user?.image} alt="" className="aspect-square w-8 rounded-lg object-cover" />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-semibold text-ink">{user?.firstName} {user?.lastName}</p>
            <p className="truncate text-sm text-muted">{user?.email}</p>
          </div>
          <Link role="menuitem" to={home} onClick={() => setOpen(false)} className={itemClass}>
            {user?.accountType === "Instructor" ? "Instructor dashboard" : "My learning"}
          </Link>
          <Link role="menuitem" to="/dashboard/my-profile" onClick={() => setOpen(false)} className={itemClass}>
            Profile
          </Link>
          <Link role="menuitem" to="/dashboard/settings" onClick={() => setOpen(false)} className={itemClass}>
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              dispatch(logout(navigate));
            }}
            className={`${itemClass} border-t border-line`}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
