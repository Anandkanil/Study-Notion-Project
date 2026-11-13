import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import { apiConnector } from "../../../services/apiconnector";
import { learnEndpoints } from "../../../services/apis";
import { Button } from "../../ui";

/** The quiz for the section being watched: answer, submit, then see the right answers. */
export default function SectionQuiz({ courseId, sectionId, sectionName }) {
  const { token } = useSelector((s) => s.auth);
  const headers = { Authorization: `Bearer ${token}` };
  const [quiz, setQuiz] = useState({ status: "loading", data: null });
  const [best, setBest] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setQuiz({ status: "loading", data: null });
    setResult(null);
    try {
      const [q, list] = await Promise.all([
        apiConnector("GET", `${learnEndpoints.BASE}/${courseId}/quizzes/${sectionId}`, null, { Authorization: `Bearer ${token}` }),
        apiConnector("GET", `${learnEndpoints.BASE}/${courseId}/quizzes`, null, { Authorization: `Bearer ${token}` }),
      ]);
      const data = q.data?.data;
      setQuiz({ status: "ready", data });
      setAnswers(Array(data.questions.length).fill(null));
      setBest((list.data?.data || []).find((x) => String(x.sectionId) === String(sectionId))?.best || null);
    } catch (e) {
      setQuiz({ status: e.response?.status === 404 ? "none" : "failed", data: null });
    }
  }, [courseId, sectionId, token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (answers.some((a) => a === null)) {
      toast.error("Answer every question first.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiConnector("POST", `${learnEndpoints.BASE}/quizzes/${quiz.data.quizId}/attempts`, { answers }, headers);
      const r = res.data?.data;
      setResult(r);
      setBest((b) => (!b || r.score > b.score ? { score: r.score, total: r.total, passed: r.passed || b?.passed } : { ...b, passed: b.passed || r.passed }));
      toast[r.passed ? "success" : "error"](res.data?.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Your answers couldn't be checked. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (quiz.status === "loading") return <div className="skeleton h-40" aria-hidden="true" />;
  if (quiz.status === "none") return <p className="text-muted">There's no quiz for “{sectionName}” yet.</p>;
  if (quiz.status === "failed")
    return (
      <div className="flex items-center gap-3">
        <p className="text-muted">The quiz couldn't load.</p>
        <Button variant="secondary" size="sm" onClick={load}>
          Try again
        </Button>
      </div>
    );

  const { questions, passPercent } = quiz.data;
  const done = answers.filter((a) => a !== null).length;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-ink">
          {sectionName} quiz · {questions.length} {questions.length === 1 ? "question" : "questions"}
        </p>
        <p className="text-sm text-muted">
          Pass mark {passPercent}%{best ? ` · Your best: ${best.score}/${best.total}${best.passed ? " (passed)" : ""}` : ""}
        </p>
      </div>

      {result && (
        <div role="status" className={`rounded-xl border p-4 ${result.passed ? "border-success/40 bg-success/10" : "border-danger/40 bg-danger/10"}`}>
          <p className="text-lg font-bold text-ink">
            {result.passed ? "Passed!" : "Not quite yet"} {result.score} of {result.total}
          </p>
          <p className="text-sm text-muted">{result.passed ? "Nice work. On to the next section." : `You need ${passPercent}% to pass. Check the answers below and try again.`}</p>
        </div>
      )}

      <ol className="flex flex-col gap-4">
        {questions.map((q, i) => {
          const r = result?.results?.[i];
          return (
            <li key={i}>
              <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-4" disabled={!!result}>
                <legend className="px-1 font-semibold text-ink">
                  {i + 1}. {q.text}
                </legend>
                {q.options.map((o, k) => {
                  const chosen = answers[i] === k;
                  const right = r && r.answer === k;
                  const wrong = r && chosen && !r.correct;
                  return (
                    <label
                      key={k}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                        right ? "border-success/60 bg-success/10" : wrong ? "border-danger/60 bg-danger/10" : chosen ? "border-accent/60 bg-accent/10" : "border-line hover:bg-raised"
                      }`}
                    >
                      <input type="radio" name={`q-${sectionId}-${i}`} checked={chosen} onChange={() => setAnswers((a) => a.map((x, j) => (j === i ? k : x)))} className="h-4 w-4 accent-[rgb(var(--accent))]" />
                      <span className="flex-1 text-ink">{o}</span>
                      {right && <span className="text-sm font-semibold text-success">Correct answer</span>}
                      {wrong && <span className="text-sm font-semibold text-danger">Your answer</span>}
                    </label>
                  );
                })}
                {r?.explain && <p className="mt-1 text-sm text-muted">{r.explain}</p>}
              </fieldset>
            </li>
          );
        })}
      </ol>

      {result ? (
        <Button variant="secondary" onClick={() => {
          setResult(null);
          setAnswers(Array(questions.length).fill(null));
        }} className="w-fit">
          Try again
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={busy} loadingText="Checking…">
            Submit answers
          </Button>
          <span className="text-sm text-muted">
            {done} of {questions.length} answered
          </span>
        </div>
      )}
    </form>
  );
}
