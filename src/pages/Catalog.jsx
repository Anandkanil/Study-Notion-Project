import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Footer from "../components/common/Footer";
import CourseCard from "../components/core/Catalog/CourseCard";
import { categorySlug } from "../components/common/Navbar";
import { Button, EmptyState, buttonClass } from "../components/ui";
import { apiConnector } from "../services/apiconnector";
import { categories, catalogData } from "../services/apis";

const SORTS = [
  ["popular", "Most enrolled"],
  ["newest", "Newest"],
];

const CardSkeletons = ({ n = 3 }) => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="skeleton aspect-video w-full" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    ))}
  </div>
);

const CourseGrid = ({ courses }) => (
  <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {courses.map((c) => (
      <li key={c._id}>
        <CourseCard course={c} />
      </li>
    ))}
  </ul>
);

// Catalogue filters: [key, label, test]
const PRICES = [
  ["any", "Any price", () => true],
  ["under1000", "Under ₹1,000", (p) => p < 1000],
  ["1000-2999", "₹1,000 – ₹2,999", (p) => p >= 1000 && p < 3000],
  ["3000plus", "₹3,000 and up", (p) => p >= 3000],
];
const LENGTHS = [
  ["any", "Any length", () => true],
  ["short", "Under 3 hours", (h) => h < 3],
  ["medium", "3 – 5 hours", (h) => h >= 3 && h < 5],
  ["long", "5 hours or more", (h) => h >= 5],
];
const selectClass = "rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink focus:border-accent focus:outline-none";

const Catalog = () => {
  const { catalogName } = useParams();
  const [state, setState] = useState({ status: "loading" });
  const [sort, setSort] = useState("popular");
  const [price, setPrice] = useState("any");
  const [length, setLength] = useState("any");

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await apiConnector("GET", categories.CATEGORIES_API);
      const category = (res.data?.data || []).find((c) => categorySlug(c.name) === catalogName);
      if (!category) {
        setState({ status: "notfound" });
        return;
      }
      try {
        const page = await apiConnector("POST", catalogData.CATALOGPAGEDATA_API, { categoryId: category._id });
        setState({ status: "ready", category, data: page.data?.data || {} });
      } catch (err) {
        // The API answers 404 when a subject has no published courses yet
        if (err?.response?.status === 404) setState({ status: "ready", category, data: {} });
        else throw err;
      }
    } catch (error) {
      console.error("Catalog error:", error);
      setState({ status: "error" });
    }
  }, [catalogName]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (state.category) document.title = `${state.category.name} courses · StudyNotion`;
  }, [state.category]);

  const allCourses = state.data?.selectedCategory?.courses || [];
  const courses = useMemo(() => {
    const p = PRICES.find(([k]) => k === price) || PRICES[0];
    const l = LENGTHS.find(([k]) => k === length) || LENGTHS[0];
    const list = allCourses.filter((c) => p[2](c.price || 0) && (length === "any" || l[2]((c.totalSeconds || 0) / 3600)));
    if (sort === "newest") list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else list.sort((a, b) => (b.studentsEnrolled?.length || 0) - (a.studentsEnrolled?.length || 0));
    return list;
  }, [allCourses, sort, price, length]);
  const filtered = price !== "any" || length !== "any";
  const clearFilters = () => {
    setPrice("any");
    setLength("any");
  };

  const other = state.data?.differentCategory;
  const popularEverywhere = (state.data?.mostSellingCourses || []).filter(
    (c) => !courses.some((own) => own._id === c._id)
  );

  if (state.status === "notfound") {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
          <EmptyState as="h1" title="We couldn't find that subject" action={<Link to="/" className={buttonClass("primary")}>See all subjects</Link>}>
            The link may be out of date, or the subject was renamed.
          </EmptyState>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <ol className="flex flex-wrap gap-2">
              <li>
                <Link to="/" className="hover:text-ink">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink">
                {state.category?.name || "Catalog"}
              </li>
            </ol>
          </nav>
          {state.category ? (
            <>
              <h1 className="mt-3 font-display text-4xl font-bold text-ink">{state.category.name}</h1>
              {state.category.description && <p className="mt-3 max-w-2xl text-lg text-muted">{state.category.description}</p>}
            </>
          ) : state.status === "error" ? (
            <h1 className="mt-3 font-display text-4xl font-bold text-ink">Catalog</h1>
          ) : (
            <div className="mt-3 flex flex-col gap-3" aria-hidden="true">
              <div className="skeleton h-10 w-72" />
              <div className="skeleton h-5 w-full max-w-xl" />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-12">
        {state.status === "error" ? (
          <EmptyState title="Courses couldn't load" action={<Button variant="secondary" onClick={load}>Try again</Button>}>
            The server may still be waking up. This usually takes under a minute.
          </EmptyState>
        ) : (
          <section aria-labelledby="cat-courses">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 id="cat-courses" className="font-display text-2xl font-medium text-ink">
                Courses{state.status === "ready" ? ` (${filtered ? `${courses.length} of ${allCourses.length}` : courses.length})` : ""}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="cat-price">Price</label>
              <select id="cat-price" value={price} onChange={(e) => setPrice(e.target.value)} className={selectClass}>
                {PRICES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <label className="sr-only" htmlFor="cat-length">Length</label>
              <select id="cat-length" value={length} onChange={(e) => setLength(e.target.value)} className={selectClass}>
                {LENGTHS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <div role="radiogroup" aria-label="Sort courses" className="flex gap-1 rounded-xl border border-line bg-surface p-1">
                {SORTS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={sort === key}
                    onClick={() => setSort(key)}
                    className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${sort === key ? "bg-accent text-on-accent" : "text-muted hover:text-ink"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              </div>
            </div>
            {state.status === "loading" ? (
              <CardSkeletons />
            ) : courses.length ? (
              <CourseGrid courses={courses} />
            ) : filtered && allCourses.length ? (
              <EmptyState title="No courses match these filters" action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}>
                Try a different price or length.
              </EmptyState>
            ) : (
              <EmptyState title="No courses here yet">New courses in {state.category?.name} will appear here once instructors publish them.</EmptyState>
            )}
          </section>
        )}

        {other?.courses?.length > 0 && (
          <section aria-labelledby="cat-other">
            <h2 id="cat-other" className="mb-5 font-display text-2xl font-medium text-ink">
              Also popular in{" "}
              <Link to={`/catalog/${categorySlug(other.name)}`} className="underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-text">
                {other.name}
              </Link>
            </h2>
            <CourseGrid courses={other.courses.slice(0, 3)} />
          </section>
        )}

        {popularEverywhere.length > 0 && (
          <section aria-labelledby="cat-top">
            <h2 id="cat-top" className="mb-5 font-display text-2xl font-medium text-ink">
              Most enrolled across StudyNotion
            </h2>
            <CourseGrid courses={popularEverywhere.slice(0, 6)} />
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Catalog;
