import React, { useState } from "react";

import { instructorEndpoints } from "../../../../services/apis";
import ConfirmationModal from "../../../common/ConfirmationModal";
import { Button, EmptyState } from "../../../ui";
import { LoadFailed, RowsSkeleton, useAdminApi, useAdminLoad, withToast } from "../Admin/shared";

const BASE = instructorEndpoints.BASE;
const blankQuestion = () => ({ text: "", options: ["", ""], answer: 0, explain: "" });
const inputClass = "w-full rounded-xl border border-field bg-bg px-3 py-2.5 text-ink";

/** Spots problems before saving, with the same rules as the server. */
function problems(questions, passPercent) {
  if (!questions.length) return "Add at least one question.";
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const opts = q.options.map((o) => o.trim()).filter(Boolean);
    if (q.text.trim().length < 3) return `Question ${i + 1}: write the question.`;
    if (opts.length < 2) return `Question ${i + 1}: give at least 2 answer options.`;
    if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) return `Question ${i + 1}: two options are the same.`;
    if (!q.options[q.answer]?.trim()) return `Question ${i + 1}: mark which option is correct.`;
  }
  if (passPercent < 40 || passPercent > 100) return "Set a pass mark between 40% and 100%.";
  return null;
}

function QuizEditor({ section, initial, onSave, onCancel }) {
  const [questions, setQuestions] = useState(initial?.questions?.length ? initial.questions.map((q) => ({ ...q, options: [...q.options] })) : [blankQuestion()]);
  const [passPercent, setPass] = useState(initial?.passPercent ?? 60);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (i, patch) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const setOption = (i, k, value) => update(i, { options: questions[i].options.map((o, j) => (j === k ? value : o)) });
  const removeOption = (i, k) => {
    const q = questions[i];
    const options = q.options.filter((_, j) => j !== k);
    update(i, { options, answer: q.answer === k ? 0 : q.answer > k ? q.answer - 1 : q.answer });
  };

  const submit = async (e) => {
    e.preventDefault();
    const p = problems(questions, Number(passPercent));
    setError(p);
    if (p) return;
    // Drop empty options, keeping the right answer pointed at the same text
    const clean = questions.map((q) => {
      const kept = q.options.map((o, j) => ({ o: o.trim(), j })).filter((x) => x.o);
      return { text: q.text.trim(), options: kept.map((x) => x.o), answer: kept.findIndex((x) => x.j === q.answer), explain: q.explain.trim() };
    });
    setBusy(true);
    await onSave({ questions: clean, passPercent: Number(passPercent) });
    setBusy(false);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <h3 className="text-lg font-semibold text-ink">Quiz for “{section.sectionName}”</h3>
      <ol className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-xl border border-line bg-bg/60 p-4">
            <div className="flex items-start gap-3">
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold text-ink">
                Question {i + 1}
                <input value={q.text} onChange={(e) => update(i, { text: e.target.value })} maxLength={300} className={`${inputClass} font-normal`} placeholder="e.g. Which HTTP method creates a resource?" />
              </label>
              {questions.length > 1 && (
                <button type="button" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))} className="mt-6 rounded-lg px-2 py-2 text-sm font-semibold text-muted hover:bg-raised hover:text-ink">
                  Remove
                </button>
              )}
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm text-muted">Options: pick the correct one</legend>
              {q.options.map((o, k) => (
                <div key={k} className="flex items-center gap-2">
                  <input type="radio" name={`answer-${i}`} checked={q.answer === k} onChange={() => update(i, { answer: k })} aria-label={`Option ${k + 1} is correct`} className="h-5 w-5 accent-[rgb(var(--success))]" />
                  <input value={o} onChange={(e) => setOption(i, k, e.target.value)} maxLength={200} placeholder={`Option ${k + 1}`} aria-label={`Question ${i + 1}, option ${k + 1}`} className={`${inputClass} ${q.answer === k ? "border-success/60" : ""}`} />
                  {q.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i, k)} aria-label={`Remove option ${k + 1}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink">
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {q.options.length < 6 && (
                <button type="button" onClick={() => update(i, { options: [...q.options, ""] })} className="w-fit rounded-lg px-2 py-1.5 text-sm font-semibold text-accent-text hover:bg-raised">
                  + Add option
                </button>
              )}
            </fieldset>
            <label className="flex flex-col gap-1.5 text-sm text-muted">
              Explanation shown after answering (optional)
              <input value={q.explain} onChange={(e) => update(i, { explain: e.target.value })} maxLength={500} className={inputClass} placeholder="Why the right answer is right" />
            </label>
          </li>
        ))}
      </ol>
      {questions.length < 30 && (
        <Button variant="secondary" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])} className="w-fit">
          Add question
        </Button>
      )}
      <label className="flex items-center gap-3 text-sm font-semibold text-ink">
        Pass mark
        <input type="number" min={40} max={100} step={5} value={passPercent} onChange={(e) => setPass(e.target.value)} className="w-24 rounded-xl border border-field bg-bg px-3 py-2 text-ink" />%
      </label>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" loading={busy} loadingText="Saving…">
          Save quiz
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Instructor: one optional quiz per section. */
export default function QuizzesTab({ courseId }) {
  const api = useAdminApi(BASE);
  const [{ status, data }, load] = useAdminLoad(`/courses/${courseId}/quizzes`, null, [courseId], BASE);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const save = async (sectionId, body) => {
    const res = await withToast(api("PUT", `/courses/${courseId}/sections/${sectionId}/quiz`, body), { loading: "Saving quiz…", fallbackError: "The quiz couldn't be saved." });
    if (res) {
      setEditing(null);
      load();
    }
  };
  const remove = async (sectionId) => {
    setConfirm(null);
    const res = await withToast(api("DELETE", `/courses/${courseId}/sections/${sectionId}/quiz`), { loading: "Deleting quiz…", fallbackError: "The quiz couldn't be deleted." });
    if (res) load();
  };

  if (status === "failed") return <LoadFailed what="Quizzes" onRetry={load} />;
  if (!data) return <RowsSkeleton label="Loading quizzes" />;
  if (!data.length) return <EmptyState title="No sections yet">Add sections to the course first. Each section can have one quiz.</EmptyState>;

  const section = data.find((s) => s.sectionId === editing);
  if (section) return <QuizEditor section={section} initial={section.quiz} onSave={(body) => save(section.sectionId, body)} onCancel={() => setEditing(null)} />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">Add a short multiple-choice quiz at the end of any section. Students see their score and the right answers after each try.</p>
      <ul className="flex flex-col gap-3">
        {data.map((s) => (
          <li key={s.sectionId} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">{s.sectionName}</p>
              <p className="text-sm text-muted">
                {s.quiz
                  ? `${s.quiz.questions.length} ${s.quiz.questions.length === 1 ? "question" : "questions"} · pass mark ${s.quiz.passPercent}% · ${s.quiz.stats.students} ${s.quiz.stats.students === 1 ? "student" : "students"} tried it, ${s.quiz.stats.passed} passing ${s.quiz.stats.passed === 1 ? "attempt" : "attempts"}`
                  : "No quiz"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant={s.quiz ? "secondary" : "primary"} size="sm" onClick={() => setEditing(s.sectionId)}>
                {s.quiz ? "Edit quiz" : "Add quiz"}
              </Button>
              {s.quiz && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setConfirm({
                      text1: `Delete the quiz for ${s.sectionName}?`,
                      text2: "Students' scores for it are deleted too. This can't be undone.",
                      btn1Text: "Delete quiz",
                      btn1Handler: () => remove(s.sectionId),
                      btn2Text: "Cancel",
                      btn2Handler: () => setConfirm(null),
                      danger: true,
                    })
                  }
                >
                  Delete
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {confirm && <ConfirmationModal modalData={confirm} />}
    </div>
  );
}
