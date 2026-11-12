import React, { useCallback, useEffect, useState } from "react";

import { learnEndpoints } from "../../../services/apis";
import { formatClock } from "../../../utils/learningMemory";
import ConfirmationModal from "../../common/ConfirmationModal";
import { Button } from "../../ui";
import { fullName, useAdminApi, withToast } from "../Dashboard/Admin/shared";

const when = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const avatar = (u) => u?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(fullName(u))}`;

/** Loads a list for the current lesson; returns [list, setList, status, reload]. */
function useLessonList(api, path, lessonId) {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("loading");
  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await api("GET", path, null, { lesson: lessonId });
      setList(res.data || []);
      setStatus("ready");
    } catch (error) {
      console.error(path, error);
      setStatus("failed");
    }
  }, [api, path, lessonId]);
  useEffect(() => {
    load();
  }, [load]);
  return [list, setList, status, load];
}

// ---------- Notes ----------
function Notes({ courseId, lessonId, getTime, seek }) {
  const api = useAdminApi(learnEndpoints.BASE);
  const [notes, setNotes, status, reload] = useLessonList(api, `/${courseId}/notes`, lessonId);
  const [text, setText] = useState("");
  const [pinAt, setPinAt] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    const at = pinAt ?? getTime();
    const res = await withToast(api("POST", `/${courseId}/notes`, { lessonId, at, text: text.trim() }), { loading: "Saving note…", fallbackError: "Your note couldn't be saved." });
    setSaving(false);
    if (res) {
      setNotes((n) => [...n, res.data].sort((a, b) => a.at - b.at));
      setText("");
      setPinAt(null);
    }
  };
  const update = async (id) => {
    const res = await withToast(api("PUT", `/notes/${id}`, { text: draft }), { loading: "Saving…", fallbackError: "Your note couldn't be saved." });
    if (res) {
      setNotes((n) => n.map((x) => (x._id === id ? { ...x, text: res.data.text } : x)));
      setEditing(null);
    }
  };
  const remove = async (id) => {
    const res = await withToast(api("DELETE", `/notes/${id}`), { loading: "Deleting…", fallbackError: "Your note couldn't be deleted." });
    if (res) setNotes((n) => n.filter((x) => x._id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={save} className="flex flex-col gap-2">
        <label htmlFor="note-text" className="text-sm font-semibold text-ink">
          New note {pinAt != null ? `at ${formatClock(pinAt)}` : "at the current moment of the video"}
        </label>
        <textarea
          id="note-text"
          value={text}
          onFocus={() => pinAt == null && setPinAt(getTime())}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="What do you want to remember?"
          className="w-full rounded-xl border border-field bg-bg px-3 py-2 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" loading={saving} loadingText="Saving…" disabled={!text.trim()}>
            Save note
          </Button>
          {pinAt != null && (
            <button type="button" onClick={() => setPinAt(getTime())} className="text-sm font-semibold text-muted hover:text-ink hover:underline">
              Use current time instead
            </button>
          )}
          <span className="ml-auto text-xs text-muted">Only you can see your notes.</span>
        </div>
      </form>

      {status === "failed" ? (
        <p className="text-muted">
          Your notes couldn't load.{" "}
          <button type="button" onClick={reload} className="font-semibold text-accent-text hover:underline">
            Try again
          </button>
        </p>
      ) : status === "loading" ? (
        <div className="skeleton h-16 rounded-xl" />
      ) : notes.length === 0 ? (
        <p className="text-muted">No notes for this lesson yet. Pause anywhere and write one; it's pinned to that moment.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {notes.map((n) => (
            <li key={n._id} className="flex gap-3 py-3">
              <button type="button" onClick={() => seek(n.at)} title="Jump to this moment" className="h-7 shrink-0 rounded-lg bg-raised px-2 font-mono text-sm font-semibold text-accent-text hover:bg-accent hover:text-on-accent">
                {formatClock(n.at)}
              </button>
              <div className="min-w-0 flex-1">
                {editing === n._id ? (
                  <div className="flex flex-col gap-2">
                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} rows={3} className="w-full rounded-xl border border-field bg-bg px-3 py-2 text-ink focus:border-accent focus:outline-none" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => update(n._id)} disabled={!draft.trim()}>
                        Save
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-line text-ink">{n.text}</p>
                    <div className="mt-1 flex gap-3 text-sm">
                      <button
                        type="button"
                        className="font-semibold text-muted hover:text-ink hover:underline"
                        onClick={() => {
                          setEditing(n._id);
                          setDraft(n.text);
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" className="font-semibold text-muted hover:text-ink hover:underline" onClick={() => remove(n._id)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Q&A ----------
export function QuestionItem({ q, api, onChange, showLesson }) {
  const [answering, setAnswering] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const answer = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await withToast(api("POST", `/questions/${q._id}/answers`, { text: text.trim() }), { loading: "Posting answer…", fallbackError: "Your answer couldn't be posted." });
    setBusy(false);
    if (res) {
      onChange({ ...q, ...res.data });
      setText("");
      setAnswering(false);
    }
  };
  const resolve = async () => {
    const res = await withToast(api("PATCH", `/questions/${q._id}`, { resolved: !q.resolved }), { loading: "Saving…", fallbackError: "The question couldn't be updated." });
    if (res) onChange({ ...q, resolved: !q.resolved });
  };
  const remove = async () => {
    setConfirm(false);
    const res = await withToast(api("DELETE", `/questions/${q._id}`), { loading: "Deleting…", fallbackError: "The question couldn't be deleted." });
    if (res) onChange(null);
  };

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex gap-3">
        <img src={avatar(q.user)} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-semibold text-ink">{fullName(q.user)}</span>
            <span className="text-muted">{when(q.createdAt)}</span>
            {showLesson && q.lessonInfo && <span className="text-muted">· {q.lessonInfo.title}</span>}
            {q.resolved ? (
              <span className="rounded-full border border-success/40 px-2 text-xs font-semibold text-success">Answered</span>
            ) : (
              q.answeredByInstructor && <span className="rounded-full border border-line px-2 text-xs font-semibold text-muted">Instructor replied</span>
            )}
          </p>
          <p className="mt-1 whitespace-pre-line text-ink">{q.text}</p>
        </div>
      </div>

      {q.answers.length > 0 && (
        <ul className="ml-12 flex flex-col gap-3 border-l-2 border-line pl-4">
          {q.answers.map((a) => (
            <li key={a._id}>
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold text-ink">{fullName(a.user)}</span>
                {a.byInstructor && <span className="rounded-full bg-accent px-2 text-xs font-bold text-on-accent">Instructor</span>}
                <span className="text-muted">{when(a.createdAt)}</span>
              </p>
              <p className="mt-0.5 whitespace-pre-line text-ink">{a.text}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="ml-12 flex flex-col gap-2">
        {answering ? (
          <form onSubmit={answer} className="flex flex-col gap-2">
            <label htmlFor={`answer-${q._id}`} className="sr-only">
              Your answer
            </label>
            <textarea id={`answer-${q._id}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} autoFocus placeholder="Write an answer" className="w-full rounded-xl border border-field bg-bg px-3 py-2 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={busy} loadingText="Posting…" disabled={text.trim().length < 2}>
                Post answer
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setAnswering(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-4 text-sm">
            <button type="button" onClick={() => setAnswering(true)} className="font-semibold text-accent-text hover:underline">
              Answer
            </button>
            {q.canManage !== false && (q.mine || q.isInstructorView) && (
              <>
                <button type="button" onClick={resolve} className="font-semibold text-muted hover:text-ink hover:underline">
                  {q.resolved ? "Mark as open" : "Mark as answered"}
                </button>
                <button type="button" onClick={() => setConfirm(true)} className="font-semibold text-muted hover:text-ink hover:underline">
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {confirm && (
        <ConfirmationModal
          modalData={{
            text1: "Delete this question?",
            text2: "Its answers are deleted too. This can't be undone.",
            btn1Text: "Delete",
            btn1Handler: remove,
            btn2Text: "Cancel",
            btn2Handler: () => setConfirm(false),
            danger: true,
          }}
        />
      )}
    </li>
  );
}

function QandA({ courseId, lessonId }) {
  const api = useAdminApi(learnEndpoints.BASE);
  const [list, setList, status, reload] = useLessonList(api, `/${courseId}/questions`, lessonId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await withToast(api("POST", `/${courseId}/questions`, { lessonId, text: text.trim() }), { loading: "Posting question…", fallbackError: "Your question couldn't be posted." });
    setBusy(false);
    if (res) {
      setList((l) => [res.data, ...l]);
      setText("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={ask} className="flex flex-col gap-2">
        <label htmlFor="question-text" className="text-sm font-semibold text-ink">
          Ask about this lesson
        </label>
        <textarea id="question-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} placeholder="Everyone in the course can see your question and answer it. The instructor will too." className="w-full rounded-xl border border-field bg-bg px-3 py-2 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
        <Button type="submit" size="sm" className="self-start" loading={busy} loadingText="Posting…" disabled={text.trim().length < 10}>
          Post question
        </Button>
        {text.trim().length > 0 && text.trim().length < 10 && <p className="text-sm text-muted">At least 10 characters.</p>}
      </form>

      {status === "failed" ? (
        <p className="text-muted">
          Questions couldn't load.{" "}
          <button type="button" onClick={reload} className="font-semibold text-accent-text hover:underline">
            Try again
          </button>
        </p>
      ) : status === "loading" ? (
        <div className="skeleton h-20 rounded-xl" />
      ) : list.length === 0 ? (
        <p className="text-muted">No questions about this lesson yet. Ask the first one.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {list.map((q) => (
            <QuestionItem key={q._id} q={q} api={api} onChange={(next) => setList((l) => (next ? l.map((x) => (x._id === q._id ? next : x)) : l.filter((x) => x._id !== q._id)))} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Notes and Q&A for the lesson being watched. */
export default function LessonTabs({ courseId, lessonId, getTime, seek }) {
  const [tab, setTab] = useState("notes");
  return (
    <section className="rounded-2xl border border-line bg-surface">
      <div role="tablist" aria-label="Lesson tools" className="flex gap-1 border-b border-line px-3">
        {[
          ["notes", "My notes"],
          ["qa", "Questions"],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-3 font-semibold transition-colors ${tab === k ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="p-4 sm:p-5">
        {tab === "notes" ? <Notes key={lessonId} courseId={courseId} lessonId={lessonId} getTime={getTime} seek={seek} /> : <QandA key={lessonId} courseId={courseId} lessonId={lessonId} />}
      </div>
    </section>
  );
}
