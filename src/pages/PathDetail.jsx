import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";

import Footer from "../components/common/Footer";
import { apiConnector } from "../services/apiconnector";
import { courseEndpoints, profileEndpoints } from "../services/apis";
import { addToCart } from "../slices/cartSlice";
import { formatINR } from "../utils/formatINR";
import { LEVEL_STYLE } from "./Paths";

/** One guided path as a roadmap: the courses in order, with the student's progress on each. */
export default function PathDetail() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { token } = useSelector((s) => s.auth);
  const { user } = useSelector((s) => s.profile);
  const cart = useSelector((s) => s.cart.cart);
  const isStudent = user?.accountType === "Student";
  const [state, setState] = useState({ status: "loading", path: null });
  const [mine, setMine] = useState(null); // courseId -> progress %

  const load = useCallback(async () => {
    setState({ status: "loading", path: null });
    try {
      const res = await apiConnector("GET", `${courseEndpoints.PATHS_API}/${encodeURIComponent(slug)}`);
      setState({ status: "ready", path: res.data?.data });
      document.title = `${res.data?.data?.title || "Path"} · StudyNotion`;
    } catch (e) {
      setState({ status: e.response?.status === 404 ? "missing" : "failed", path: null });
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token || !isStudent) return;
    apiConnector("GET", profileEndpoints.GET_USER_ENROLLED_COURSES_API, null, { Authorization: `Bearer ${token}` })
      .then((res) => setMine(new Map((res.data?.data || []).map((c) => [String(c._id), Math.round(c.progressPercentage || 0)]))))
      .catch(() => setMine(new Map()));
  }, [token, isStudent]);

  const path = state.path;
  const progress = useMemo(() => {
    if (!path || !mine) return null;
    const lessonsDone = path.courses.reduce((n, c) => n + Math.round(((mine.get(String(c._id)) || 0) / 100) * c.lessons), 0);
    return { pct: path.totalLessons ? Math.round((lessonsDone / path.totalLessons) * 100) : 0, lessonsDone };
  }, [path, mine]);

  if (state.status === "loading") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-10" aria-label="Loading path">
        <div className="skeleton h-10 w-2/3" />
        <div className="skeleton h-5 w-1/2" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-28 rounded-2xl" />
        ))}
      </main>
    );
  }
  if (!path) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col items-start gap-4 px-4 py-16">
        <h1 className="text-2xl font-bold text-ink">{state.status === "missing" ? "This path doesn't exist" : "This path couldn't load"}</h1>
        {state.status === "failed" ? (
          <button type="button" onClick={load} className="rounded-xl bg-raised px-4 py-2.5 font-semibold text-ink">
            Try again
          </button>
        ) : (
          <Link to="/paths" className="font-semibold text-accent-text hover:underline">
            See all paths
          </Link>
        )}
      </main>
    );
  }

  const owned = (id) => mine?.has(String(id));
  const notOwned = path.courses.filter((c) => !owned(c._id) && !cart.some((x) => x._id === c._id));
  const remainingPrice = notOwned.reduce((n, c) => n + (Number(c.price) || 0), 0);
  // The first course not finished is "up next"
  const nextId = mine ? path.courses.find((c) => (mine.get(String(c._id)) ?? -1) < 100)?._id : null;

  const addAll = () =>
    notOwned.forEach((c) =>
      dispatch(addToCart({ _id: c._id, courseName: c.courseName, thumbnail: c.thumbnail, price: c.price, category: { name: c.category }, ratingAndReviews: [] }))
    );

  return (
    <div className="flex flex-col">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link to="/paths" className="hover:text-ink">
            Guided paths
          </Link>{" "}
          / <span className="text-ink">{path.title}</span>
        </nav>
        <header className="flex flex-col gap-3">
          <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${LEVEL_STYLE[path.level] || ""}`}>{path.level}</span>
          <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] font-bold tracking-[-0.02em] text-ink">{path.title}</h1>
          <p className="max-w-2xl text-lg text-muted">{path.summary}</p>
          <p className="text-sm text-muted">
            {path.courses.length} courses · {path.totalLessons} lessons · {formatINR(path.totalPrice)} in total
          </p>
        </header>

        {progress && (
          <section aria-label="Your progress" className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold text-ink">Your progress</p>
              <p className="text-sm text-muted">
                {progress.lessonsDone} of {path.totalLessons} lessons
              </p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.pct} aria-label="Path progress">
              <div className="btn-grad h-full rounded-full" style={{ width: `${progress.pct}%` }} />
            </div>
          </section>
        )}

        {(!token || isStudent) && notOwned.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-surface/80 p-5">
            <p className="text-ink">
              {mine?.size ? `${notOwned.length} ${notOwned.length === 1 ? "course" : "courses"} left to get` : "Get the whole path"}{" "}
              <span className="text-muted">· {formatINR(remainingPrice)}</span>
            </p>
            {token ? (
              <button type="button" onClick={addAll} className="btn-grad min-h-[46px] rounded-xl px-5 font-semibold">
                Add {notOwned.length === path.courses.length ? "all" : "the rest"} to cart
              </button>
            ) : (
              <Link to="/login" state={{ from: `/paths/${slug}` }} className="btn-grad inline-flex min-h-[46px] items-center rounded-xl px-5 font-semibold">
                Log in to start
              </Link>
            )}
          </div>
        )}

        <ol className="relative flex flex-col gap-5 pl-12" aria-label="Courses in order">
          <span className="absolute bottom-6 left-[19px] top-6 w-0.5 bg-line" aria-hidden="true" />
          {path.courses.map((c, i) => {
            const pct = mine?.get(String(c._id));
            const done = pct === 100;
            const next = String(c._id) === String(nextId);
            return (
              <li key={c._id} className="relative">
                <span
                  className={`absolute -left-12 top-5 grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-bold ${done ? "border-success bg-success text-bg" : next ? "btn-grad border-transparent" : "border-line bg-surface text-muted"}`}
                  aria-hidden="true"
                >
                  {done ? "✓" : i + 1}
                </span>
                <article className={`flex flex-wrap items-center gap-4 rounded-2xl border bg-surface p-4 ${next ? "border-accent/50" : "border-line"}`}>
                  {c.thumbnail && <img src={c.thumbnail} alt="" className="aspect-video w-full rounded-xl object-cover sm:w-40" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted">
                      Step {i + 1}
                      {next && " · Up next"}
                      {done && " · Finished"}
                    </p>
                    <h2 className="text-lg font-bold text-ink">
                      <Link to={`/courses/${c._id}`} className="hover:text-accent-text">
                        {c.courseName}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted">{[c.instructor, `${c.lessons} lessons`, c.category].filter(Boolean).join(" · ")}</p>
                    {pct != null && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${c.courseName} progress`}>
                        <div className={`h-full rounded-full ${done ? "bg-success" : "btn-grad"}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {pct != null ? (
                      <Link to="/dashboard/enrolled-courses" className="rounded-xl bg-raised px-4 py-2.5 text-sm font-semibold text-ink hover:bg-line">
                        {done ? "Review" : pct > 0 ? `Continue · ${pct}%` : "Start"}
                      </Link>
                    ) : (
                      <>
                        <span className="font-bold text-ink">{formatINR(c.price)}</span>
                        <Link to={`/courses/${c._id}`} className="text-sm font-semibold text-accent-text hover:underline">
                          View course
                        </Link>
                      </>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </main>
      <Footer />
    </div>
  );
}
