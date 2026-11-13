import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { apiConnector } from "../../services/apiconnector";
import { notificationEndpoints } from "../../services/apis";
import useOnClickOutside from "../../hooks/useOnClickOutside";

const ICONS = {
  answer: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  announcement: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6",
  "course-review": "M4 4h16v16H4zM8 12l3 3 5-6",
  refund: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  enrolled: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5",
  "new-student": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6",
  completed: "M6 9a6 6 0 1 0 12 0a6 6 0 1 0-12 0M8.5 14L7 21l5-3 5 3-1.5-7",
  "review-reply": "M12 2l3 7 7.5.6-5.7 4.9 1.8 7.5L12 18l-6.6 4 1.8-7.5L1.5 9.6 9 9z",
};

const ago = (iso) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} ${d === 1 ? "day" : "days"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const POLL_MS = 60 * 1000;

/** Bell with an unread count; opens the latest 30 notices. Checks every minute while the tab is visible. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const { token } = useSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0, loaded: false, failed: false });
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));

  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    try {
      const res = await apiConnector("GET", notificationEndpoints.LIST_API, null, { Authorization: `Bearer ${token}` });
      const d = res.data?.data || {};
      setData({ items: d.items || [], unread: d.unread || 0, loaded: true, failed: false });
    } catch {
      setData((x) => ({ ...x, loaded: true, failed: true }));
    }
  }, [token]);

  useEffect(() => {
    load();
    const tick = () => document.visibilityState === "visible" && load();
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    load();
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, load]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read) {
      setData((x) => ({ ...x, unread: Math.max(0, x.unread - 1), items: x.items.map((i) => (i._id === n._id ? { ...i, read: true } : i)) }));
      apiConnector("PATCH", notificationEndpoints.READ_API(n._id), null, headers).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    setData((x) => ({ ...x, unread: 0, items: x.items.map((i) => ({ ...i, read: true })) }));
    apiConnector("POST", notificationEndpoints.READ_ALL_API, null, headers).catch(() => load());
  };

  const label = data.unread ? `Notifications, ${data.unread} unread` : "Notifications";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink hover:bg-raised"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {data.unread > 0 && (
          <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-xs font-bold text-white">
            {data.unread > 9 ? "9+" : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-[var(--shadow-pop)]">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="font-bold text-ink">Notifications</p>
            {data.unread > 0 && (
              <button type="button" onClick={readAll} className="rounded-lg px-2 py-1 text-sm font-semibold text-accent-text hover:bg-raised">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {!data.loaded ? (
              <div className="flex flex-col gap-2 p-3" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="skeleton h-14" />
                ))}
              </div>
            ) : data.failed && !data.items.length ? (
              <p className="px-4 py-6 text-sm text-muted">Notifications couldn't load. Try again in a moment.</p>
            ) : !data.items.length ? (
              <div className="px-4 py-8 text-center">
                <p className="font-semibold text-ink">You're all caught up</p>
                <p className="mt-1 text-sm text-muted">Answers, announcements and course updates show up here.</p>
              </div>
            ) : (
              <ul className="flex flex-col p-1.5">
                {data.items.map((n) => (
                  <li key={n._id}>
                    <button type="button" onClick={() => openItem(n)} className={`flex w-full gap-3 rounded-xl px-3 py-3 text-left hover:bg-raised ${n.read ? "" : "bg-accent/[0.07]"}`}>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${n.read ? "bg-raised text-muted" : "btn-grad"}`} aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={ICONS[n.type] || ICONS.announcement} />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${n.read ? "text-ink/80" : "font-semibold text-ink"}`}>{n.title}</span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{n.body}</span>}
                        <span className="mt-1 block text-xs text-muted">{ago(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
