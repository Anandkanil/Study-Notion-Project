import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { apiConnector } from "../../../services/apiconnector";
import { courseEndpoints } from "../../../services/apis";

const seenKey = (userId, courseId) => `sn:${userId}:announcements-seen:${courseId}`;
const readSeen = (k) => {
  try {
    return Number(localStorage.getItem(k)) || 0;
  } catch {
    return 0;
  }
};

/** Instructor announcements for a course, shown above the lesson. New ones open by default. */
export default function Announcements({ courseId }) {
  const { token } = useSelector((s) => s.auth);
  const { user } = useSelector((s) => s.profile);
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const key = seenKey(user?._id, courseId);
  const [seen] = useState(() => readSeen(key));

  useEffect(() => {
    let alive = true;
    apiConnector("GET", `${courseEndpoints.COURSE_BASE}/${courseId}/announcements`, null, { Authorization: `Bearer ${token}` })
      .then((res) => {
        if (!alive) return;
        const data = res.data?.data || [];
        setList(data);
        if (data.some((a) => new Date(a.createdAt).getTime() > seen)) setOpen(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [courseId, token, seen]);

  // Opening the panel marks everything as read
  useEffect(() => {
    if (!open || list.length === 0) return;
    try {
      localStorage.setItem(key, String(new Date(list[0].createdAt).getTime()));
    } catch {
      /* storage unavailable */
    }
  }, [open, list, key]);

  if (list.length === 0) return null;
  const unread = list.filter((a) => new Date(a.createdAt).getTime() > seen).length;

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="font-semibold text-ink">Announcements from your instructor</span>
        {unread > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">{unread} new</span>}
        <span className="ml-auto text-sm text-muted">{open ? "Hide" : `Show ${list.length}`}</span>
      </button>
      {open && (
        <ul className="flex flex-col divide-y divide-line border-t border-line">
          {list.map((a) => (
            <li key={a._id} className="px-4 py-3">
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-ink">{a.title}</span>
                <span className="text-sm text-muted">{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </p>
              <p className="mt-1 whitespace-pre-line text-ink">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
