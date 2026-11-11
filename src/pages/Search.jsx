import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import Footer from "../components/common/Footer";
import CourseCard from "../components/core/Catalog/CourseCard";
import { categorySlug } from "../components/common/Navbar";
import { Button, EmptyState } from "../components/ui";
import { apiConnector } from "../services/apiconnector";
import { categories, courseEndpoints } from "../services/apis";

const MIN_CHARS = 2;

const CardSkeletons = () => (
  <div role="status" aria-label="Searching" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="skeleton aspect-video w-full" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    ))}
  </div>
);

export default function Search() {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get("q") || "";
  const [text, setText] = useState(urlQuery);
  const [state, setState] = useState({ status: "idle", courses: [] });
  const [subjects, setSubjects] = useState([]);
  const requestId = useRef(0);

  // Subjects to suggest before anything is typed and when nothing matches
  useEffect(() => {
    apiConnector("GET", categories.CATEGORIES_API)
      .then((res) => setSubjects((res.data?.data || []).filter((c) => c?.courses?.length > 0)))
      .catch(() => {});
  }, []);

  // Keep the box in step with the URL (back/forward, links to /search?q=…)
  useEffect(() => {
    setText(urlQuery);
  }, [urlQuery]);

  // Typing updates the URL after a short pause, so results are shareable
  useEffect(() => {
    const t = setTimeout(() => {
      const q = text.trim();
      if (q !== urlQuery.trim()) setParams(q ? { q } : {}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [text, urlQuery, setParams]);

  const runSearch = async (q) => {
    const id = ++requestId.current;
    setState((s) => ({ status: "loading", courses: s.courses }));
    try {
      const res = await apiConnector("GET", courseEndpoints.SEARCH_COURSES_API, null, null, { q });
      if (id === requestId.current) setState({ status: "done", courses: res.data?.courses || [] });
    } catch (error) {
      console.error("Search error:", error);
      if (id === requestId.current) setState({ status: "failed", courses: [] });
    }
  };

  useEffect(() => {
    const q = urlQuery.trim();
    if (q.length < MIN_CHARS) {
      requestId.current++;
      setState({ status: "idle", courses: [] });
      return;
    }
    runSearch(q);
  }, [urlQuery]);

  const q = urlQuery.trim();
  const subjectLinks = subjects.length > 0 && (
    <ul className="flex flex-wrap gap-2">
      {subjects.map((c) => (
        <li key={c._id}>
          <Link to={`/catalog/${categorySlug(c.name)}`} className="inline-block rounded-full border border-line bg-surface px-4 py-2 font-semibold text-ink hover:bg-raised">
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Search courses</h1>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const value = text.trim();
              setParams(value ? { q: value } : {}, { replace: true });
            }}
            className="flex max-w-2xl items-center gap-2 rounded-2xl border border-field bg-surface px-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-muted">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <label htmlFor="course-search" className="sr-only">
              Search by course, subject or instructor
            </label>
            <input
              id="course-search"
              type="search"
              autoFocus
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Course, subject or instructor"
              className="h-14 w-full bg-transparent text-lg text-ink placeholder:text-muted focus:outline-none"
            />
          </form>
        </div>

        <div aria-live="polite" className="flex flex-col gap-6">
          {state.status === "idle" ? (
            <div className="flex flex-col gap-4">
              <p className="text-muted">
                {text.trim().length === 1 ? "Keep typing: searches start at 2 letters." : "Try a topic like React, cloud or security. Or browse a subject:"}
              </p>
              {subjectLinks}
            </div>
          ) : state.status === "failed" ? (
            <EmptyState title="Search isn't working right now" action={<Button variant="secondary" onClick={() => runSearch(q)}>Try again</Button>}>
              The server may still be waking up. This usually takes under a minute.
            </EmptyState>
          ) : state.status === "loading" && state.courses.length === 0 ? (
            <CardSkeletons />
          ) : state.courses.length === 0 ? (
            <EmptyState title={`No courses match "${q}"`} action={subjectLinks || null}>
              Check the spelling or try a broader word. You can also browse by subject:
            </EmptyState>
          ) : (
            <>
              <p className="font-semibold text-muted">
                {state.courses.length} {state.courses.length === 1 ? "course" : "courses"} for "{q}"
              </p>
              <ul className={`grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 ${state.status === "loading" ? "opacity-60" : ""}`}>
                {state.courses.map((c) => (
                  <li key={c._id}>
                    <CourseCard course={c} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
