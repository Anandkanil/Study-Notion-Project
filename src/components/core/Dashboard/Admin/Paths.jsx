import React, { useState } from "react";
import { Link } from "react-router-dom";

import ConfirmationModal from "../../../common/ConfirmationModal";
import { Button, EmptyState, Field } from "../../../ui";
import { LoadFailed, PageHeader, RowsSkeleton, useAdminApi, useAdminLoad, withToast } from "./shared";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const EMPTY = { title: "", summary: "", level: "Beginner", courses: [], published: false };

function PathForm({ initial = EMPTY, options, onSubmit, onCancel, submitText }) {
  const [v, setV] = useState({ ...EMPTY, ...initial });
  const [pick, setPick] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const nameOf = (id) => options.find((o) => o._id === id)?.courseName || "Unpublished course";
  const move = (i, d) =>
    setV((x) => {
      const c = [...x.courses];
      [c[i], c[i + d]] = [c[i + d], c[i]];
      return { ...x, courses: c };
    });

  const errors = {
    title: v.title.trim().length < 3 ? "Give the path a title of at least 3 characters." : null,
    summary: v.summary.trim().length < 10 ? "Add a short summary (at least 10 characters)." : null,
    courses: v.published && v.courses.length < 2 ? "Add at least 2 courses before publishing." : null,
  };
  const available = options.filter((o) => !v.courses.includes(o._id));

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setTried(true);
        if (Object.values(errors).some(Boolean)) return;
        setBusy(true);
        const ok = await onSubmit({ ...v, title: v.title.trim(), summary: v.summary.trim() });
        setBusy(false);
        if (ok && !onCancel) {
          setV(EMPTY);
          setTried(false);
        }
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field label="Title" value={v.title} onChange={set("title")} maxLength={80} error={tried ? errors.title : undefined} placeholder="e.g. Full-stack web developer" />
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
          Level
          <select value={v.level} onChange={set("level")} className="min-h-[46px] rounded-xl border border-field bg-bg px-3 font-normal text-ink">
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
        Summary
        <textarea value={v.summary} onChange={set("summary")} maxLength={300} rows={2} placeholder="Who it's for and what they'll be able to do at the end" className="rounded-xl border border-field bg-bg px-3 py-2.5 font-normal text-ink" aria-invalid={tried && !!errors.summary} />
        {tried && errors.summary && <span className="font-normal text-danger">{errors.summary}</span>}
      </label>

      <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Courses, in the order to take them</legend>
        {v.courses.length === 0 && <p className="text-sm text-muted">No courses yet. Add them below.</p>}
        <ol className="flex flex-col gap-2">
          {v.courses.map((id, i) => (
            <li key={id} className="flex items-center gap-2 rounded-lg bg-raised px-3 py-2">
              <span className="w-6 text-sm font-bold text-muted">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate text-ink">{nameOf(id)}</span>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${nameOf(id)} up`} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-line hover:text-ink disabled:opacity-30">
                ↑
              </button>
              <button type="button" disabled={i === v.courses.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${nameOf(id)} down`} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-line hover:text-ink disabled:opacity-30">
                ↓
              </button>
              <button type="button" onClick={() => setV((x) => ({ ...x, courses: x.courses.filter((c) => c !== id) }))} aria-label={`Remove ${nameOf(id)}`} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-line hover:text-ink">
                ✕
              </button>
            </li>
          ))}
        </ol>
        {v.courses.length < 12 && (
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor={`pick-${initial._id || "new"}`}>
              Course to add
            </label>
            <select id={`pick-${initial._id || "new"}`} value={pick} onChange={(e) => setPick(e.target.value)} className="min-h-[42px] min-w-0 flex-1 rounded-xl border border-field bg-bg px-3 text-ink">
              <option value="">Choose a published course…</option>
              {available.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.courseName}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              disabled={!pick}
              onClick={() => {
                setV((x) => ({ ...x, courses: [...x.courses, pick] }));
                setPick("");
              }}
            >
              Add course
            </Button>
          </div>
        )}
        {tried && errors.courses && <p className="text-sm text-danger">{errors.courses}</p>}
      </fieldset>

      <label className="flex items-center gap-3 font-semibold text-ink">
        <input type="checkbox" checked={v.published} onChange={set("published")} className="h-5 w-5 accent-[rgb(var(--accent))]" />
        Published (shown on the Paths page)
      </label>

      <div className="flex gap-2">
        <Button type="submit" loading={busy} loadingText="Saving…">
          {submitText}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export default function AdminPaths() {
  const api = useAdminApi();
  const [{ status, data }, load] = useAdminLoad("/paths");
  const [{ data: options }] = useAdminLoad("/paths/course-options");
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const create = async (body) => {
    const res = await withToast(api("POST", "/paths", body), { loading: "Saving path…", fallbackError: "The path couldn't be saved." });
    if (res) load();
    return !!res;
  };
  const save = async (id, body) => {
    const res = await withToast(api("PUT", `/paths/${id}`, body), { loading: "Saving path…", fallbackError: "The path couldn't be saved." });
    if (res) {
      setEditing(null);
      load();
    }
    return !!res;
  };
  const remove = async (p) => {
    setConfirm(null);
    const res = await withToast(api("DELETE", `/paths/${p._id}`), { loading: "Deleting path…", fallbackError: "The path couldn't be deleted." });
    if (res) load();
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Guided paths">Ordered sets of courses that build on each other. Students see their progress across the whole path.</PageHeader>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 text-lg font-semibold text-ink">New path</h2>
        {options ? <PathForm options={options} onSubmit={create} submitText="Save path" /> : <RowsSkeleton rows={2} label="Loading courses" />}
      </section>

      {status === "failed" ? (
        <LoadFailed what="Paths" onRetry={load} />
      ) : !data ? (
        <RowsSkeleton label="Loading paths" />
      ) : data.length === 0 ? (
        <EmptyState title="No paths yet">Create the first one above. It stays a draft until you tick Published.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((p) => (
            <li key={p._id} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              {editing === p._id ? (
                <PathForm
                  initial={{ _id: p._id, title: p.title, summary: p.summary, level: p.level, published: p.published, courses: p.courseIds }}
                  options={options || []}
                  onSubmit={(body) => save(p._id, body)}
                  onCancel={() => setEditing(null)}
                  submitText="Save changes"
                />
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                      {p.title}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.published ? "bg-success/15 text-success" : "bg-raised text-muted"}`}>{p.published ? "Published" : "Draft"}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {p.level} · {p.courses.map((c) => c.courseName).join(" → ") || "No courses"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {p.published && (
                      <Link to={`/paths/${p.slug}`} className="rounded-xl px-3 py-2 text-sm font-semibold text-accent-text hover:bg-raised">
                        View
                      </Link>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => setEditing(p._id)}>
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          text1: `Delete ${p.title}?`,
                          text2: "The courses stay as they are; only the path is removed. This can't be undone.",
                          btn1Text: "Delete path",
                          btn1Handler: () => remove(p),
                          btn2Text: "Cancel",
                          btn2Handler: () => setConfirm(null),
                          danger: true,
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {confirm && <ConfirmationModal modalData={confirm} />}
    </div>
  );
}
