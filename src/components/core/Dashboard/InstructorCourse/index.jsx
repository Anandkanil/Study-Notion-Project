import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { instructorEndpoints, learnEndpoints } from "../../../../services/apis";
import { QuestionItem } from "../../ViewCourse/LessonTabs";
import { Segmented } from "../Admin/shared";
import { formatINR } from "../../../../utils/formatINR";
import ConfirmationModal from "../../../common/ConfirmationModal";
import { Button, EmptyState, Field, buttonClass } from "../../../ui";
import { ColumnChart } from "../Admin/charts";
import QuizzesTab from "./QuizzesTab";
import { LoadFailed, RowsSkeleton, fullName, shortDate, useAdminApi, useAdminLoad, withToast } from "../Admin/shared";

const BASE = instructorEndpoints.BASE;
const TABS = [
  ["stats", "Stats"],
  ["reviews", "Reviews"],
  ["announcements", "Announcements"],
  ["questions", "Q&A"],
  ["quizzes", "Quizzes"],
  ["codes", "Discount codes"],
];
const MONTH = (y, m, style) => new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: style, year: style === "long" ? "numeric" : undefined, timeZone: "UTC" });
const rupees = (v) => formatINR(v) || "₹0";
const compactRupees = (v) => (v >= 1000 ? `₹${(v / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}K` : `₹${v}`);

const Stat = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-line bg-surface p-5">
    <p className="text-sm font-semibold text-muted">{label}</p>
    <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
    {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
  </div>
);

// ---------- Stats ----------
function StatsTab({ courseId, data }) {
  const { totals, months, lessons, tracked } = data;
  const series = months.map((m) => ({
    key: `${m.year}-${m.month}`,
    label: MONTH(m.year, m.month, "short"),
    full: MONTH(m.year, m.month, "long"),
    value: m.revenue,
    extra: `${m.sales} ${m.sales === 1 ? "sale" : "sales"}`,
  }));
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Students" value={totals.students.toLocaleString("en-IN")} hint={`${totals.finished} finished the course`} />
        <Stat label="Revenue" value={rupees(totals.revenue)} hint={`${totals.orders} ${totals.orders === 1 ? "sale" : "sales"}, after discounts`} />
        <Stat label="Average progress" value={`${totals.avgCompletion}%`} hint="of lessons completed per student" />
        <Stat label="Rating" value={totals.rating != null ? totals.rating.toFixed(1) : "—"} hint={`${totals.ratings} ${totals.ratings === 1 ? "rating" : "ratings"}`} />
      </div>

      <ColumnChart title="Revenue" subtitle="By month, last 12 months" data={series} format={rupees} tickFormat={compactRupees} emptyText="No sales in the last 12 months yet." />

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
        <div>
          <h2 className="font-display text-lg font-medium text-ink">Where students stop</h2>
          <p className="text-sm text-muted">
            Share of enrolled students who finished each lesson, in course order{tracked ? ` (${tracked} ${tracked === 1 ? "student" : "students"})` : ""}. A sharp drop shows a lesson worth improving.
          </p>
        </div>
        {lessons.length === 0 ? (
          <p className="py-6 text-center text-muted">Add lessons to see this.</p>
        ) : tracked === 0 ? (
          <p className="py-6 text-center text-muted">This fills in once students start the course.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {lessons.map((l, i) => {
              const pct = Math.round((l.completed / tracked) * 100);
              const prev = i > 0 ? Math.round((lessons[i - 1].completed / tracked) * 100) : null;
              const drop = prev != null && prev - pct >= 20;
              return (
                <li key={l.id} className="flex flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-ink">
                      {i + 1}. {l.title} <span className="text-muted">· {l.section}</span>
                    </span>
                    {drop && <span className="shrink-0 font-semibold text-danger">↓ {prev - pct} points</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="h-3 rounded-r-[4px]" style={{ width: `${Math.max(1, pct * 0.8)}%`, background: "rgb(var(--chart-1))" }} aria-hidden="true" />
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{pct}%</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <p className="text-sm text-muted">
        <Link to={`/courses/${courseId}`} className="font-semibold text-accent-text underline-offset-4 hover:underline">
          Open the course page
        </Link>{" "}
        to see it the way students do.
      </p>
    </div>
  );
}

// ---------- Reviews ----------
function ReviewsTab({ courseId }) {
  const api = useAdminApi(BASE);
  const [{ status, data }, load] = useAdminLoad(`/courses/${courseId}/reviews`, null, [courseId], BASE);
  const [drafts, setDrafts] = useState({});
  const [editing, setEditing] = useState(null);

  const save = async (id) => {
    const res = await withToast(api("PUT", `/reviews/${id}/reply`, { text: drafts[id] || "" }), { loading: "Posting reply…", fallbackError: "Your reply couldn't be posted." });
    if (res) {
      setEditing(null);
      load();
    }
  };
  const remove = async (id) => {
    const res = await withToast(api("DELETE", `/reviews/${id}/reply`), { loading: "Removing reply…", fallbackError: "Your reply couldn't be removed." });
    if (res) load();
  };

  if (status === "failed") return <LoadFailed what="Reviews" onRetry={load} />;
  if (!data) return <RowsSkeleton label="Loading reviews" />;
  if (data.length === 0) return <EmptyState title="No reviews yet">Students can review the course once they've started it. Their reviews show up here for you to reply to.</EmptyState>;

  return (
    <ul className="flex flex-col gap-3">
      {data.map((r) => (
        <li key={r._id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-ink">
              {fullName(r.user)}
              {r.hidden && (
                <span className="ml-2 rounded-full border border-line px-2 py-0.5 align-middle text-xs font-semibold text-muted" title="An admin hid this review. Students don't see it and it doesn't count towards your rating.">
                  Hidden by admin
                </span>
              )}
            </p>
            <p className="text-sm text-muted">
              {"★".repeat(r.rating)}
              <span className="text-line">{"★".repeat(5 - r.rating)}</span> · {shortDate(r.createdAt)}
            </p>
          </div>
          {r.review && <p className="whitespace-pre-line text-ink">{r.review}</p>}
          {editing === r._id || !r.reply?.text ? (
            editing === r._id || drafts[r._id] !== undefined ? (
              <div className="flex flex-col gap-2 border-l-2 border-accent pl-4">
                <Field as="textarea" label="Your public reply" value={drafts[r._id] ?? r.reply?.text ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [r._id]: e.target.value }))} maxLength={1000} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save(r._id)} disabled={!(drafts[r._id] ?? "").trim()}>
                    Post reply
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(null);
                      setDrafts((d) => {
                        const n = { ...d };
                        delete n[r._id];
                        return n;
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="secondary" className="self-start" onClick={() => setDrafts((d) => ({ ...d, [r._id]: "" }))}>
                Reply
              </Button>
            )
          ) : (
            <div className="flex flex-col gap-2 border-l-2 border-accent pl-4">
              <p className="text-sm font-semibold text-muted">Your reply · {shortDate(r.reply.at)}</p>
              <p className="whitespace-pre-line text-ink">{r.reply.text}</p>
              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  className="font-semibold text-accent-text hover:underline"
                  onClick={() => {
                    setDrafts((d) => ({ ...d, [r._id]: r.reply.text }));
                    setEditing(r._id);
                  }}
                >
                  Edit
                </button>
                <button type="button" className="font-semibold text-muted hover:text-ink hover:underline" onClick={() => remove(r._id)}>
                  Remove
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------- Announcements ----------
function AnnouncementsTab({ courseId, students }) {
  const api = useAdminApi(BASE);
  const [{ status, data }, load] = useAdminLoad(`/courses/${courseId}/announcements`, null, [courseId], BASE);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const post = async (e) => {
    e.preventDefault();
    setTried(true);
    if (title.trim().length < 3 || body.trim().length < 10) return;
    setBusy(true);
    const res = await withToast(api("POST", `/courses/${courseId}/announcements`, { title: title.trim(), body: body.trim(), email }), { loading: email ? "Posting and emailing…" : "Posting…", fallbackError: "The announcement couldn't be posted." });
    setBusy(false);
    if (res) {
      setTitle("");
      setBody("");
      setTried(false);
      load();
    }
  };
  const remove = async (id) => {
    setConfirm(null);
    const res = await withToast(api("DELETE", `/announcements/${id}`), { loading: "Deleting…", fallbackError: "The announcement couldn't be deleted." });
    if (res) load();
  };

  return (
    <div className="flex flex-col gap-6">
      <form noValidate onSubmit={post} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-medium text-ink">New announcement</h2>
        <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. New lesson added" error={tried && title.trim().length < 3 ? "Give it a title of at least 3 characters." : undefined} />
        <Field as="textarea" label="Message" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} error={tried && body.trim().length < 10 ? "Write a message of at least 10 characters." : undefined} />
        <label className="flex items-center gap-3 text-ink">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--accent))]" />
          Also email it to enrolled students{students > 50 ? " (the first 50; everyone sees it in the course)" : ` (${students})`}
        </label>
        <Button type="submit" className="self-start" loading={busy} loadingText="Posting…">
          Post announcement
        </Button>
      </form>

      {status === "failed" ? (
        <LoadFailed what="Announcements" onRetry={load} />
      ) : !data ? (
        <RowsSkeleton rows={2} label="Loading announcements" />
      ) : data.length === 0 ? (
        <p className="text-muted">No announcements yet. Students see them at the top of every lesson.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((a) => (
            <li key={a._id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-ink">{a.title}</p>
                <p className="text-sm text-muted">
                  {shortDate(a.createdAt)}
                  {a.emailedTo ? ` · emailed to ${a.emailedTo}` : ""}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-line text-ink">{a.body}</p>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-muted hover:text-ink hover:underline"
                onClick={() =>
                  setConfirm({
                    text1: `Delete "${a.title}"?`,
                    text2: "Students won't see it any more. Emails already sent can't be recalled.",
                    btn1Text: "Delete",
                    btn1Handler: () => remove(a._id),
                    btn2Text: "Cancel",
                    btn2Handler: () => setConfirm(null),
                    danger: true,
                  })
                }
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {confirm && <ConfirmationModal modalData={confirm} />}
    </div>
  );
}

// ---------- Q&A ----------
function QuestionsTab({ courseId }) {
  const learnApi = useAdminApi(learnEndpoints.BASE);
  const [filter, setFilter] = useState("open");
  const [{ status, data }, load] = useAdminLoad(`/courses/${courseId}/questions`, filter === "open" ? { open: "1" } : null, [courseId, filter], BASE);
  const [list, setList] = useState(null);
  const shown = list ?? data;

  useEffect(() => setList(null), [data]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">Answer once and every student in the course sees it. The student who asked gets an email.</p>
        <Segmented label="Show" value={filter} onChange={setFilter} options={[["open", "Waiting for you"], ["all", "All questions"]]} />
      </div>
      {status === "failed" ? (
        <LoadFailed what="Questions" onRetry={load} />
      ) : !shown ? (
        <RowsSkeleton rows={3} label="Loading questions" />
      ) : shown.length === 0 ? (
        <EmptyState title={filter === "open" ? "You're all caught up" : "No questions yet"}>
          {filter === "open" ? "Every question has an answer from you or is marked as answered." : "Students can ask under any lesson. Their questions appear here."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface px-4">
          {shown.map((q) => (
            <QuestionItem
              key={q._id}
              q={{ ...q, isInstructorView: true }}
              api={learnApi}
              showLesson
              onChange={(next) => setList((shown || []).map((x) => (x._id === q._id ? next : x)).filter(Boolean))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Discount codes ----------
function CodesTab({ courseId, price }) {
  const api = useAdminApi(BASE);
  const [{ status, data }, load] = useAdminLoad(`/courses/${courseId}/coupons`, null, [courseId], BASE);
  const [form, setForm] = useState({ code: "", percentOff: "20", expiresAt: "", maxUses: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === "code" ? e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") : e.target.value }));
  const pct = Number(form.percentOff);
  const preview = price && pct >= 1 && pct <= 90 ? `${formatINR(price)} → ${formatINR(Math.round((price * (100 - pct)) / 100))}` : "";

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = { code: form.code, percentOff: Number(form.percentOff), expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null, maxUses: form.maxUses ? Number(form.maxUses) : null };
    const res = await withToast(api("POST", `/courses/${courseId}/coupons`, body), { loading: "Creating code…", fallbackError: "The code couldn't be created." });
    setBusy(false);
    if (res) {
      setForm({ code: "", percentOff: "20", expiresAt: "", maxUses: "" });
      load();
    }
  };
  const toggle = async (c) => {
    const res = await withToast(api("PATCH", `/coupons/${c._id}`, { active: !c.active }), { loading: "Saving…", fallbackError: "The code couldn't be updated." });
    if (res) load();
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-medium text-ink">New discount code</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Code" value={form.code} onChange={set("code")} maxLength={20} placeholder="LAUNCH20" required hint="3–20 letters or numbers" />
          <Field label="Discount (%)" type="number" min={1} max={90} value={form.percentOff} onChange={set("percentOff")} required hint={preview} />
          <Field label="Expires (optional)" type="date" min={today} value={form.expiresAt} onChange={set("expiresAt")} hint="Ends at midnight" />
          <Field label="Use limit (optional)" type="number" min={1} value={form.maxUses} onChange={set("maxUses")} placeholder="Unlimited" />
        </div>
        <Button type="submit" className="self-start" loading={busy} loadingText="Creating…" disabled={form.code.length < 3}>
          Create code
        </Button>
      </form>

      {status === "failed" ? (
        <LoadFailed what="Discount codes" onRetry={load} />
      ) : !data ? (
        <RowsSkeleton rows={2} label="Loading codes" />
      ) : data.length === 0 ? (
        <p className="text-muted">No codes yet. Share a code and students enter it at checkout.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          {data.map((c) => {
            const expired = c.expiresAt && new Date(c.expiresAt) <= new Date();
            const usedUp = c.maxUses != null && c.uses >= c.maxUses;
            const state = !c.active ? "Off" : expired ? "Expired" : usedUp ? "Used up" : "Active";
            return (
              <li key={c._id} className="flex flex-wrap items-center gap-4 p-4">
                <span className="font-mono text-lg font-bold text-ink">{c.code}</span>
                <span className="text-sm text-muted">
                  {c.percentOff}% off · used {c.uses}
                  {c.maxUses != null ? ` of ${c.maxUses}` : ""} · {c.expiresAt ? `${expired ? "expired" : "expires"} ${shortDate(c.expiresAt)}` : "no expiry"}
                </span>
                <span className={`ml-auto rounded-full border px-2.5 py-0.5 text-xs font-semibold ${state === "Active" ? "border-success/40 text-success" : "border-line text-muted"}`}>{state}</span>
                <Button size="sm" variant="secondary" onClick={() => toggle(c)}>
                  {c.active ? "Switch off" : "Switch on"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function InstructorCourse() {
  const { courseId } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "stats";
  const [{ status, data }, load] = useAdminLoad(`/courses/${courseId}/stats`, null, [courseId], BASE);

  if (status === "failed") return <LoadFailed what="This course" onRetry={load} />;
  if (!data) return <RowsSkeleton rows={4} label="Loading course" />;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/dashboard/my-courses" className="self-start text-sm font-semibold text-muted hover:text-ink">
        ← My courses
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">{data.course.courseName}</h1>
          <p className="mt-1 text-muted">
            {data.course.status === "Pending" ? "Waiting for review" : data.course.status} · {rupees(data.course.price)}
          </p>
        </div>
        <Link to={`/dashboard/edit-course/${courseId}`} className={buttonClass("secondary")}>
          Edit course
        </Link>
      </div>

      <div role="tablist" aria-label="Course tools" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setParams(k === "stats" ? {} : { tab: k }, { replace: true })}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 font-semibold transition-colors ${tab === k ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "stats" && <StatsTab courseId={courseId} data={data} />}
        {tab === "reviews" && <ReviewsTab courseId={courseId} />}
        {tab === "announcements" && <AnnouncementsTab courseId={courseId} students={data.totals.students} />}
        {tab === "questions" && <QuestionsTab courseId={courseId} />}
        {tab === "quizzes" && <QuizzesTab courseId={courseId} />}
        {tab === "codes" && <CodesTab courseId={courseId} price={data.course.price} />}
      </div>
    </div>
  );
}
