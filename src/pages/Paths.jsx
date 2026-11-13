import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Footer from "../components/common/Footer";
import { apiConnector } from "../services/apiconnector";
import { courseEndpoints } from "../services/apis";
import { formatINR } from "../utils/formatINR";

export const LEVEL_STYLE = {
  Beginner: "bg-success/15 text-success",
  Intermediate: "bg-accent/15 text-accent-text",
  Advanced: "bg-danger/15 text-danger",
};

/** All published guided paths. */
export default function Paths() {
  const [state, setState] = useState({ status: "loading", list: [] });

  const load = useCallback(async () => {
    setState({ status: "loading", list: [] });
    try {
      const res = await apiConnector("GET", courseEndpoints.PATHS_API);
      setState({ status: "ready", list: res.data?.data || [] });
    } catch {
      setState({ status: "failed", list: [] });
    }
  }, []);

  useEffect(() => {
    document.title = "Guided paths · StudyNotion";
    load();
  }, [load]);

  return (
    <div className="flex flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] font-bold tracking-[-0.02em] text-ink">Guided paths</h1>
          <p className="mt-2 max-w-2xl text-muted">Courses put in a sensible order, so you always know what to learn next. Track your progress across the whole path.</p>
        </div>

        {state.status === "loading" ? (
          <div className="grid gap-5 md:grid-cols-2" aria-hidden="true">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-56 rounded-2xl" />
            ))}
          </div>
        ) : state.status === "failed" ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-line bg-surface p-6">
            <p className="text-muted">Paths couldn't load. The server may still be waking up.</p>
            <button type="button" onClick={load} className="rounded-xl bg-raised px-4 py-2.5 font-semibold text-ink">
              Try again
            </button>
          </div>
        ) : state.list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-8">
            <h2 className="text-xl font-semibold text-ink">No paths yet</h2>
            <p className="mt-1 text-muted">
              Our team is putting the first ones together. Meanwhile, <Link to="/search" className="font-semibold text-accent-text hover:underline">browse all courses</Link>.
            </p>
          </div>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {state.list.map((p) => (
              <li key={p._id}>
                <Link to={`/paths/${p.slug}`} className="group flex h-full flex-col gap-4 rounded-2xl border border-ink/10 bg-surface/80 p-6 transition-colors hover:border-ink/20">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_STYLE[p.level] || ""}`}>{p.level}</span>
                    <span className="text-sm text-muted">
                      {p.courses.length} courses · {p.totalLessons} lessons
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-ink group-hover:text-accent-text">{p.title}</h2>
                    <p className="mt-1.5 text-muted">{p.summary}</p>
                  </div>
                  <ol className="mt-auto flex flex-wrap items-center gap-2 text-sm" aria-label="Courses in order">
                    {p.courses.map((c, i) => (
                      <li key={c._id} className="flex items-center gap-2">
                        <span className="rounded-lg bg-raised px-2.5 py-1 text-ink">{c.courseName}</span>
                        {i < p.courses.length - 1 && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" aria-hidden="true">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        )}
                      </li>
                    ))}
                  </ol>
                  <p className="text-sm text-muted">{formatINR(p.totalPrice)} for the whole path</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
