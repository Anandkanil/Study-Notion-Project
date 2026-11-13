import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { apiConnector } from "../../services/apiconnector";
import { courseEndpoints } from "../../services/apis";
import { formatINR } from "../../utils/formatINR";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const shortcutLabel = isMac ? "⌘K" : "Ctrl K";

/** Quick links shown before typing, by role. */
const quickLinks = (user) => {
  const base = [["Browse all courses", "/search"]];
  if (!user) return base;
  if (user.accountType === "Student")
    return [["My learning", "/dashboard/enrolled-courses"], ["Saved lessons", "/dashboard/saved-lessons"], ["Wishlist", "/dashboard/wishlist"], ["Purchases", "/dashboard/purchases"], ...base];
  if (user.accountType === "Instructor") return [["My courses", "/dashboard/my-courses"], ["New course", "/dashboard/add-course"], ...base];
  return [["Admin overview", "/dashboard/admin"], ["Courses to review", "/dashboard/admin/courses"], ...base];
};

/**
 * Search box that opens from anywhere with Ctrl+K / ⌘K (or the navbar button).
 * Arrow keys move through results, Enter opens one, Escape closes.
 */
export default function CommandSearch({ open, onClose }) {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.profile);
  const [q, setQ] = useState("");
  const [state, setState] = useState({ status: "idle", courses: [] });
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setQ("");
    setState({ status: "idle", courses: [] });
    setActive(0);
    const prev = document.activeElement;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return undefined;
    const term = q.trim();
    if (term.length < 2) {
      setState({ status: "idle", courses: [] });
      return undefined;
    }
    setState((s) => ({ ...s, status: "loading" }));
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await apiConnector("GET", courseEndpoints.SEARCH_COURSES_API, null, null, { q: term });
        if (alive) {
          setState({ status: "ready", courses: (res.data?.courses || []).slice(0, 8) });
          setActive(0);
        }
      } catch {
        if (alive) setState({ status: "failed", courses: [] });
      }
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, open]);

  if (!open) return null;

  const term = q.trim();
  const items =
    term.length >= 2
      ? [
          ...state.courses.map((c) => ({ key: c._id, label: c.courseName, sub: [c.category?.name, c.instructor && `${c.instructor.firstName} ${c.instructor.lastName}`].filter(Boolean).join(" · "), price: c.price, to: `/courses/${c._id}`, thumb: c.thumbnail })),
          { key: "all", label: `See all results for “${term}”`, to: `/search?q=${encodeURIComponent(term)}` },
        ]
      : quickLinks(user).map(([label, to]) => ({ key: to, label, to }));

  const go = (item) => {
    onClose();
    navigate(item.to);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      go(items[active]);
    } else if (e.key === "Tab") {
      // Keep focus inside the dialog
      const nodes = dialogRef.current?.querySelectorAll("input, button, a[href]");
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Search" onKeyDown={onKeyDown} className="w-full max-w-xl overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-[var(--shadow-pop)]">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-muted">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <label htmlFor="cmd-search" className="sr-only">
            Search courses
          </label>
          <input
            ref={inputRef}
            id="cmd-search"
            type="search"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses, subjects or instructors"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-results"
            aria-activedescendant={items[active] ? `cmd-item-${active}` : undefined}
            className="h-14 flex-1 bg-transparent text-ink placeholder:text-muted focus:outline-none"
          />
          <kbd className="rounded-md border border-line px-1.5 py-0.5 text-xs text-muted">Esc</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {term.length < 2 && <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted">Go to</p>}
          {state.status === "loading" && <p className="px-3 py-3 text-sm text-muted">Searching…</p>}
          {state.status === "failed" && <p className="px-3 py-3 text-sm text-muted">Search isn't working right now. Press Enter to try the full search page.</p>}
          {state.status === "ready" && state.courses.length === 0 && <p className="px-3 py-3 text-sm text-muted">No courses match “{term}”.</p>}
          <ul id="cmd-results" role="listbox" aria-label="Results" className="flex flex-col">
            {items.map((item, i) => (
              <li key={item.key} id={`cmd-item-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${i === active ? "bg-raised" : ""}`}
                >
                  {item.thumb && <img src={item.thumb} alt="" className="h-9 w-14 shrink-0 rounded-md object-cover" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{item.label}</span>
                    {item.sub && <span className="block truncate text-sm text-muted">{item.sub}</span>}
                  </span>
                  {item.price != null && <span className="shrink-0 text-sm font-semibold text-ink">{formatINR(item.price)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden border-t border-line px-4 py-2.5 text-xs text-muted sm:block">
          <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> to move · <kbd className="font-sans">Enter</kbd> to open · <kbd className="font-sans">Esc</kbd> to close
        </p>
      </div>
    </div>,
    document.body
  );
}
