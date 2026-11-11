import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

import Footer from "../components/common/Footer";
import ReviewSlider from "../components/common/ReviewSlider";
import CourseCard from "../components/core/Catalog/CourseCard";
import { categorySlug } from "../components/common/Navbar";
import { apiConnector } from "../services/apiconnector";
import { categories, courseEndpoints } from "../services/apis";
import InstructorImage from "../assets/Images/Instructor.png";
import { formatClock, getLastLesson, getPosition } from "../utils/learningMemory";

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-base font-bold text-on-accent transition hover:brightness-105";
const btnGhost =
  "inline-flex items-center justify-center rounded-xl border border-richblack-600 px-6 py-3.5 text-base font-bold text-ink transition hover:bg-raised";

function PlayerPreview() {
  return (
    <figure className="m-0 rounded-[20px] border border-line bg-surface p-3.5 shadow-[var(--shadow-pop)]">
      <div className="grid aspect-video place-items-center rounded-xl bg-[rgb(14_17_40)]" aria-hidden="true">
        <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-accent">
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5l12 7-12 7z" fill="rgb(20 24 51)" />
          </svg>
        </span>
      </div>
      <div className="px-1.5 pb-1 pt-3.5">
        <div className="relative h-1.5 rounded bg-line" aria-hidden="true">
          <div className="h-full w-[58%] rounded bg-accent" />
          {[22, 47, 76].map((left) => (
            <span key={left} className="absolute -top-[3px] h-3 w-0.5 bg-ink" style={{ left: `${left}%` }} />
          ))}
        </div>
        <figcaption className="mt-3 flex justify-between gap-3 text-[15px] text-muted">
          <span>Pick up exactly where you stopped</span>
          <span>12:40 / 21:55</span>
        </figcaption>
      </div>
    </figure>
  );
}

/** Signed-in students who have watched something on this device get a one-tap way back in. */
function ContinueLearning() {
  const { user } = useSelector((state) => state.profile);
  const token = useSelector((state) => state.auth.token);
  if (!token || !user?._id || user.accountType === "Instructor") return null;
  const last = getLastLesson(user._id);
  if (!last?.courseId || !last?.subSectionId) return null;
  const position = getPosition(user._id, last.subSectionId);
  const href = `/view-course/${last.courseId}/section/${last.sectionId}/sub-section/${last.subSectionId}`;
  return (
    <section aria-label="Continue learning" className="mx-auto w-full max-w-6xl px-6 pt-8">
      <Link to={href} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3 pr-5 transition-colors hover:bg-raised">
        {last.thumbnail && <img src={last.thumbnail} alt="" className="hidden aspect-video w-32 rounded-xl object-cover sm:block" />}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-muted">Continue learning{position >= 3 ? ` · ${formatClock(position)} in` : ""}</span>
          <span className="truncate font-bold text-ink">{last.lessonTitle}</span>
          {last.courseName && <span className="truncate text-sm text-muted">{last.courseName}</span>}
        </span>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M8 5l12 7-12 7z" fill="currentColor" className="text-on-accent" />
          </svg>
        </span>
      </Link>
    </section>
  );
}

const STEPS = [
  ["Choose a course", "Browse by subject, read the syllabus and see what other learners thought."],
  ["Pay once, in rupees", "Check out with UPI, card or net banking. The course stays in your account."],
  ["Learn at your pace", "Short video lessons. Your progress saves after every lesson."],
];

function Home() {
  const [cats, setCats] = useState(null);
  const [popular, setPopular] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setCats(null);
    setPopular(null);
    try {
      const [catRes, courseRes] = await Promise.all([
        apiConnector("GET", categories.CATEGORIES_API),
        apiConnector("GET", courseEndpoints.GET_ALL_COURSE_API),
      ]);
      setCats((catRes.data?.data || []).filter((c) => c?.courses?.length > 0));
      const published = (courseRes.data?.courses || []).filter((c) => c.status === "Published");
      published.sort((a, b) => (b.studentsCount ?? b.studentsEnrolled?.length ?? 0) - (a.studentsCount ?? a.studentsEnrolled?.length ?? 0));
      setPopular(published.slice(0, 4));
    } catch (error) {
      console.error("Home data error:", error);
      setFailed(true);
      setCats([]);
      setPopular([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firstCatalog = cats?.[0] ? `/catalog/${categorySlug(cats[0].name)}` : "/signup";

  return (
    <div className="flex flex-col">
      <ContinueLearning />
      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-12 pt-14 md:grid-cols-[1fr_1.05fr] md:pt-20">
        <div>
          <h1 className="font-display text-[clamp(2.4rem,5vw,3.4rem)] font-bold leading-[1.08] text-ink">
            Learning that fits after work.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
            Short video lessons in web development, cloud, machine learning, UI/UX and security. Pause any time — StudyNotion remembers the exact lesson you stopped at.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={firstCatalog} className={btnPrimary}>
              Browse courses
            </Link>
            <Link to="/signup?role=instructor" className={btnGhost}>
              Teach on StudyNotion
            </Link>
          </div>
        </div>
        <PlayerPreview />
      </section>

      {/* Subjects (hidden if they failed to load; the retry below covers it) */}
      {(cats === null || cats.length > 0) && (
      <section aria-labelledby="home-subjects" className="mx-auto w-full max-w-6xl px-6 py-8">
        <h2 id="home-subjects" className="font-display text-2xl font-medium text-ink">
          Pick a subject
        </h2>
        <div className="mt-5 flex flex-wrap gap-3">
          {cats === null
            ? [0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12 w-40 rounded-xl" aria-hidden="true" />)
            : cats.map((c) => (
                <Link
                  key={c._id}
                  to={`/catalog/${categorySlug(c.name)}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 font-semibold text-ink transition-colors hover:bg-raised"
                >
                  {c.name}
                  <span className="rounded-md bg-raised px-2 py-0.5 text-sm font-medium text-muted">
                    {c.courses.length} {c.courses.length === 1 ? "course" : "courses"}
                  </span>
                </Link>
              ))}
        </div>
      </section>
      )}

      {/* Most enrolled */}
      <section aria-labelledby="home-popular" className="mx-auto w-full max-w-6xl px-6 py-10">
        <h2 id="home-popular" className="font-display text-2xl font-medium text-ink">
          Most enrolled
        </h2>
        {failed ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-richblack-600 bg-surface p-6">
            <p className="text-muted">Courses couldn't load. The server may still be waking up.</p>
            <button type="button" onClick={load} className={btnGhost}>
              Try again
            </button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {popular === null
              ? [0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4" aria-hidden="true">
                    <div className="skeleton aspect-video w-full" />
                    <div className="skeleton h-5 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                  </div>
                ))
              : popular.map((course) => <CourseCard key={course._id} course={course} />)}
          </div>
        )}
      </section>

      {/* How it works — a real sequence, so numbered */}
      <section aria-labelledby="home-how" className="mx-auto w-full max-w-6xl px-6 py-12">
        <h2 id="home-how" className="font-display text-2xl font-medium text-ink">
          How it works
        </h2>
        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="rounded-2xl border border-line bg-surface p-6">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent font-bold text-on-accent" aria-hidden="true">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{title}</h3>
              <p className="mt-1.5 text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Teach */}
      <section aria-labelledby="home-teach" className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl border border-line bg-surface md:grid-cols-2">
          <img src={InstructorImage} alt="" loading="lazy" className="h-full max-h-[420px] w-full object-cover" />
          <div className="p-8 md:pr-12">
            <h2 id="home-teach" className="font-display text-3xl font-semibold text-ink">
              Teach what you know
            </h2>
            <p className="mt-4 text-lg text-muted">
              Build a course from sections and video lessons, set your price, and see enrolments and income on your instructor dashboard.
            </p>
            <Link to="/signup?role=instructor" className={`${btnPrimary} mt-7`}>
              Become an instructor
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <ReviewSlider />

      <Footer />
    </div>
  );
}

export default Home;
