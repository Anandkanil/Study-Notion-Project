import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

import Footer from "../components/common/Footer";
import ReviewSlider from "../components/common/ReviewSlider";
import CourseCard from "../components/core/Catalog/CourseCard";
import { categorySlug } from "../components/common/Navbar";
import { apiConnector } from "../services/apiconnector";
import { categories, courseEndpoints } from "../services/apis";
import { formatClock, getLastLesson, getPosition } from "../utils/learningMemory";

const btnGrad = "btn-grad inline-flex min-h-[46px] items-center justify-center rounded-xl px-5 text-[15px] font-semibold";
const btnQuiet =
  "inline-flex min-h-[46px] items-center justify-center rounded-xl bg-raised px-5 text-[15px] font-semibold text-ink transition-colors hover:bg-line";
const card = "rounded-xl border border-ink/10 bg-surface/80";

/* Single-path stroke icons used by the orbits and feature cards */
const ICON = {
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z",
  note: "M5 3h10l4 4v14H5zM9 12h6M9 16h4",
  play: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM10 9l5 3-5 3z",
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4",
  cap: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5",
  flame: "M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-7z",
  cloud: "M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  globe: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  award: "M6 9a6 6 0 1 0 12 0a6 6 0 1 0-12 0M8.5 14L7 21l5-3 5 3-1.5-7",
  monitor: "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 20h8M12 16v4",
  question: "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5",
  target: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M8 12a4 4 0 1 0 8 0a4 4 0 1 0-8 0",
  check: "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M8 12l3 3 5-6",
};

const Icon = ({ name, size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d={ICON[name]} />
  </svg>
);

const RING_1 = ["chat", "note", "play", "code", "cap", "flame", "award", "question", "book"];
const RING_2 = ["cloud", "shield", "globe", "monitor", "target", "code", "play", "note", "chat"];
const PLANETS = [
  ...RING_1.map((icon, i) => ({ icon, angle: i * 40, radius: 600, duration: 240, reverse: false })),
  ...RING_2.map((icon, i) => ({ icon, angle: i * 40 + 20, radius: 750, duration: 320, reverse: true })),
];

// Fixed pseudo-random particles so the layout is the same on every render
const PARTICLES = (() => {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: 40 }, () => ({
    x: rnd() * 100,
    y: rnd() * 100,
    o: 0.3 + rnd() * 0.5,
    dx1: rnd() * 30 - 15,
    dy1: rnd() * 30 - 15,
    dx2: rnd() * 30 - 15,
    dy2: rnd() * 30 - 15,
    d: 8 + rnd() * 6,
    delay: -rnd() * 10,
  }));
})();

function HeroBackdrop() {
  return (
    <div aria-hidden="true">
      <div className="sn-orbit-c top-[640px]">
        <div className="sn-ring" style={{ width: 1200, height: 1200, margin: "-600px 0 0 -600px" }} />
        <div className="sn-ring" style={{ width: 1500, height: 1500, margin: "-750px 0 0 -750px" }} />
        {PLANETS.map((p, i) => (
          <span
            key={i}
            className="sn-planet"
            style={{ "--angle": p.angle, "--radius": p.radius, animationDuration: `${p.duration}s`, animationDirection: p.reverse ? "reverse" : "normal" }}
          >
            <Icon name={p.icon} />
          </span>
        ))}
      </div>
      <div className="sn-flare sn-flare-v top-[330px]" />
      <div className="sn-flare sn-flare-s top-[560px]" />
      <div className="sn-flare sn-flare-h top-[600px]" />
      <div className="pointer-events-none absolute left-1/2 top-[250px] -z-10 h-[420px] w-[900px] -translate-x-1/2">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="sn-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              "--p": p.o,
              "--dx1": `${p.dx1}px`,
              "--dy1": `${p.dy1}px`,
              "--dx2": `${p.dx2}px`,
              "--dy2": `${p.dy2}px`,
              animationDuration: `${p.d}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** A still of the student dashboard, faded at the bottom like a window peeking up. */
function DashboardPreview() {
  return (
    <div className="sn-fade-bottom mx-auto w-full max-w-[980px] px-4 sm:px-6" aria-hidden="true">
      <div className="flex overflow-hidden rounded-2xl border border-ink/10 bg-bg/90">
        <div className="hidden w-[200px] shrink-0 flex-col gap-1 border-r border-ink/10 p-3 text-[13px] font-medium md:flex">
          <p className="mb-3 ml-2 text-base font-bold text-ink">StudyNotion</p>
          {["My learning", "Wishlist", "Cart", "Purchases", "Settings"].map((item, i) => (
            <span key={item} className={`rounded-lg px-2.5 py-2 ${i === 0 ? "bg-raised text-ink" : "text-muted"}`}>
              {item}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3.5 p-5 text-left">
          <p className="text-xs text-muted">Dashboard › My learning</p>
          <p className="text-xl font-bold text-ink">Good evening</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Streak", "5 days"],
              ["This week", "4 / 5"],
              ["Certificates", "1"],
            ].map(([label, value]) => (
              <div key={label} className={`${card} p-3.5`}>
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 text-xl font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>
          <div className={`${card} flex flex-col gap-2.5 p-3.5`}>
            {[
              ["Your current course", "14 / 23 lessons", 61],
              ["Another course", "9 / 30 lessons", 30],
            ].map(([name, count, pct]) => (
              <React.Fragment key={name}>
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-ink">{name}</span>
                  <span className="text-muted">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-raised">
                  <div className="btn-grad h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Signed-in students who have watched something on this device get a one-tap way back in. */
function ContinueLearning() {
  const { user } = useSelector((state) => state.profile);
  const token = useSelector((state) => state.auth.token);
  if (!token || !user?._id || user.accountType !== "Student") return null;
  const last = getLastLesson(user._id);
  if (!last?.courseId || !last?.subSectionId) return null;
  const position = getPosition(user._id, last.subSectionId);
  const href = `/view-course/${last.courseId}/section/${last.sectionId}/sub-section/${last.subSectionId}`;
  return (
    <section aria-label="Continue learning" className="mx-auto w-full max-w-3xl px-6 pt-6">
      <Link to={href} className={`${card} flex items-center gap-4 p-3 pr-5 transition-colors hover:border-ink/20`}>
        {last.thumbnail && <img src={last.thumbnail} alt="" className="hidden aspect-video w-28 rounded-lg object-cover sm:block" />}
        <span className="flex min-w-0 flex-1 flex-col text-left">
          <span className="text-sm font-semibold text-muted">Continue learning{position >= 3 ? ` · ${formatClock(position)} in` : ""}</span>
          <span className="truncate font-bold text-ink">{last.lessonTitle}</span>
          {last.courseName && <span className="truncate text-sm text-muted">{last.courseName}</span>}
        </span>
        <span className="btn-grad grid h-11 w-11 shrink-0 place-items-center rounded-full" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M8 5l12 7-12 7z" fill="currentColor" />
          </svg>
        </span>
      </Link>
    </section>
  );
}

const PROMISES = [
  ["A free first lesson", "Watch the opening lesson of any course before you pay."],
  ["Instructors who answer", "Ask under the lesson. Instructor answers are marked and emailed to you."],
  ["Reviewed before publishing", "Every course is checked by our team before it reaches the catalog."],
];

const TABS = [
  {
    label: "Lessons",
    title: "Pick up where you stopped",
    rows: ["The player remembers your spot in every lesson", "Course announcements show above the video"],
    points: [
      ["Resume in one click", "StudyNotion keeps your place in every lesson, on this device."],
      ["Every lesson counts", "Finished lessons grow your progress and your daily streak."],
      ["Stay in the loop", "Instructor announcements appear right on the lesson page."],
    ],
  },
  {
    label: "Notes",
    title: "Your notes",
    rows: ["04:12 · Health checks decide where traffic goes", "09:40 · Scale out on CPU, not memory"],
    points: [
      ["Note at any second", "Each note is stamped with the moment in the video."],
      ["Jump back", "Click a note to return to that moment."],
      ["Private to you", "Only you can see your notes."],
    ],
  },
  {
    label: "Questions",
    title: "Questions on this lesson",
    rows: ["Why does my JWT expire after a refresh?", "Instructor: check the cookie settings first"],
    points: [
      ["Ask in context", "Questions sit under the lesson they're about."],
      ["Answers from the instructor", "They're marked and emailed to you."],
      ["Mark it solved", "Close the question once it's answered."],
    ],
  },
  {
    label: "Certificates",
    title: "Course complete",
    rows: ["All lessons finished", "Certificate ready to download"],
    points: [
      ["Earned, not bought", "Finish every lesson to get it."],
      ["Your name on it", "Download it as a PDF to share."],
      ["Rate the course", "Tell other learners what you thought."],
    ],
  },
];

const FAQ = [
  {
    topic: "Courses and access",
    items: [
      ["How long can I watch a course?", "For as long as StudyNotion runs. You pay once for each course."],
      ["Can I try a course first?", "Yes. The first lesson of every course is free to watch from its page."],
    ],
  },
  {
    topic: "Payments and refunds",
    items: [
      ["How do I pay?", "Through Razorpay with UPI, a card or net banking."],
      ["Do I get a receipt?", "Every payment and refund has a receipt in Purchases that you can save as a PDF."],
      ["Do you have discount codes?", "Instructors sometimes share codes. Enter one in your cart before you pay."],
    ],
  },
  {
    topic: "Certificates",
    items: [["When do I get my certificate?", "As soon as you finish every lesson in the course. It's in My learning."]],
  },
  {
    topic: "Teaching",
    items: [
      ["How do I publish a course?", "Create it from your instructor dashboard and send it for review. Our team approves it before it goes live."],
      ["Can I see how my course is doing?", "Yes. Each course has stats, reviews, questions, announcements and discount codes."],
    ],
  },
];

const formatINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function Home() {
  const [cats, setCats] = useState(null);
  const [courses, setCourses] = useState(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState(0);
  const [topic, setTopic] = useState(0);

  const load = useCallback(async () => {
    setFailed(false);
    setCats(null);
    setCourses(null);
    try {
      const [catRes, courseRes] = await Promise.all([
        apiConnector("GET", categories.CATEGORIES_API),
        apiConnector("GET", courseEndpoints.GET_ALL_COURSE_API),
      ]);
      setCats((catRes.data?.data || []).filter((c) => c?.courses?.length > 0));
      const published = (courseRes.data?.courses || []).filter((c) => c.status === "Published");
      published.sort((a, b) => (b.studentsCount ?? b.studentsEnrolled?.length ?? 0) - (a.studentsCount ?? a.studentsEnrolled?.length ?? 0));
      setCourses(published);
    } catch (error) {
      console.error("Home data error:", error);
      setFailed(true);
      setCats([]);
      setCourses([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const firstCatalog = cats?.[0] ? `/catalog/${categorySlug(cats[0].name)}` : "/search";
  const popular = courses?.slice(0, 4) ?? null;
  const lowestPrice = useMemo(() => {
    const prices = (courses || []).map((c) => Number(c.price)).filter((n) => n > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [courses]);

  // The marquee lists real subjects and courses, doubled so the loop is seamless
  const chips = useMemo(() => {
    const list = [
      ...(cats || []).map((c) => ({ key: `c-${c._id}`, title: c.name, sub: `${c.courses.length} ${c.courses.length === 1 ? "course" : "courses"}`, to: `/catalog/${categorySlug(c.name)}` })),
      ...(courses || []).slice(0, 8).map((c) => ({ key: `k-${c._id}`, title: c.courseName, sub: c.category?.name || "Course", to: `/courses/${c._id}` })),
    ];
    return list.length ? [...list, ...list] : [];
  }, [cats, courses]);

  const t = TABS[tab];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <div className="relative isolate overflow-hidden">
        <HeroBackdrop />
        <ContinueLearning />
        <section className="mx-auto flex max-w-[820px] flex-col items-center gap-5 px-6 pb-16 pt-16 text-center sm:pt-20">
          <span className="rounded-full bg-raised px-3 py-1 text-[13px] font-medium text-ink">Courses by engineers who build for a living</span>
          <h1 className="text-[clamp(2.3rem,5.6vw,3.75rem)] font-bold leading-[1.12] tracking-[-0.025em] text-ink">
            Learn the skills teams hire for
            <span className="block font-serif font-normal tracking-[-0.01em]">with StudyNotion</span>
          </h1>
          <p className="max-w-[600px] text-[17px] leading-relaxed text-muted">
            Video courses in web development, cloud and security, with notes and questions under every lesson, a daily streak, and a certificate when you finish.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <Link to="/search" className={btnQuiet}>
              Free previews
            </Link>
            <Link to={firstCatalog} className={btnGrad}>
              Browse courses
            </Link>
          </div>
        </section>
        <DashboardPreview />
      </div>

      {/* Promises + marquee */}
      <section className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center gap-14 px-6 pb-24 pt-10">
        <div className="flex flex-[1_1_420px] flex-col gap-6">
          <h2 className="text-[clamp(1.9rem,3.6vw,2.5rem)] font-bold leading-tight tracking-[-0.02em] text-ink">
            Made to be finished.
            <br />
            Not just started.
          </h2>
          {PROMISES.map(([title, body]) => (
            <div key={title}>
              <p className="flex items-center gap-2 font-bold text-ink">
                <Icon name="check" />
                {title}
              </p>
              <p className="mt-1.5 text-[15px] text-muted">{body}</p>
            </div>
          ))}
        </div>
        <div className="sn-vmarq h-[420px] flex-[1_1_380px]">
          {chips.length ? (
            <ul className="sn-vtrack" aria-label="Subjects and courses">
              {chips.map((c, i) => (
                <li key={`${c.key}-${i}`} aria-hidden={i >= chips.length / 2 ? "true" : undefined}>
                  <Link to={c.to} tabIndex={i >= chips.length / 2 ? -1 : undefined} className={`${card} flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:border-ink/20`}>
                    <span className="btn-grad grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold">{c.title.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{c.title}</span>
                      <span className="text-[13px] text-muted">{c.sub}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col gap-3.5" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-[68px]" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features bento */}
      <section aria-labelledby="home-features" className="mx-auto w-full max-w-[1100px] px-6 pb-24">
        <h2 id="home-features" className="text-[clamp(1.7rem,3.2vw,2.25rem)] font-bold tracking-[-0.02em] text-ink">
          Everything you need to finish a course
        </h2>
        <p className="mb-8 mt-2 text-muted">The tools sit right next to the video, so you never lose your place.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className={`${card} flex min-h-[220px] flex-col gap-3.5 p-6 md:col-span-2`}>
            <div className="flex justify-between text-[13px] text-muted">
              <span>First lesson</span>
              <span>Certificate</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-raised">
              <div className="sn-fill btn-grad h-full rounded-full" />
            </div>
            <div className="mt-auto">
              <h3 className="text-lg font-bold text-ink">Progress you can see</h3>
              <p className="mt-1.5 text-[15px] text-muted">Every finished lesson moves the bar, and the player remembers where you stopped.</p>
            </div>
          </div>
          <div className={`${card} flex min-h-[220px] flex-col gap-3 p-6`}>
            <div className="flex flex-col gap-2 text-[13px]" aria-hidden="true">
              <span className="rounded-lg bg-raised px-2.5 py-2 text-ink">04:12 · Health checks decide where traffic goes</span>
              <span className="rounded-lg bg-bg px-2.5 py-2 text-muted">09:40 · Scale out on CPU, not memory</span>
            </div>
            <div className="mt-auto">
              <h3 className="text-lg font-bold text-ink">Notes at any second</h3>
              <p className="mt-1.5 text-[15px] text-muted">Click a note to jump back to that moment.</p>
            </div>
          </div>
          <div className={`${card} flex min-h-[240px] flex-col gap-3 p-6`}>
            <div className="rounded-lg bg-bg p-3 font-mono text-[13px] leading-relaxed text-ink/80" aria-hidden="true">
              <span className="text-accent-text">const</span> user = await User.findById(id)
              <br />
              res.json(user)
              <span className="sn-caret" />
            </div>
            <div className="mt-auto">
              <h3 className="text-lg font-bold text-ink">Learn by building</h3>
              <p className="mt-1.5 text-[15px] text-muted">Projects you can put on your résumé.</p>
            </div>
          </div>
          <div className={`${card} flex min-h-[240px] flex-col gap-3 p-6`}>
            <div className="flex flex-col gap-2 text-[13px]" aria-hidden="true">
              <span className="rounded-lg bg-bg px-3 py-2.5 text-ink">Why does my JWT expire after a refresh?</span>
              <span className="rounded-lg border border-accent/40 bg-raised px-3 py-2.5 text-ink">
                <strong className="text-accent-text">Instructor</strong> · Check the cookie's sameSite setting first.
              </span>
            </div>
            <div className="mt-auto">
              <h3 className="text-lg font-bold text-ink">Ask the instructor</h3>
              <p className="mt-1.5 text-[15px] text-muted">Questions live under each lesson.</p>
            </div>
          </div>
          <div className={`${card} flex min-h-[240px] flex-col gap-3 p-6`}>
            <div className="relative grid h-[120px] place-items-center" aria-hidden="true">
              <span className="absolute h-40 w-40 rounded-full border border-ink/10" />
              <span className="btn-grad relative grid h-16 w-16 place-items-center rounded-2xl text-2xl font-extrabold">5</span>
            </div>
            <div className="mt-auto">
              <h3 className="text-lg font-bold text-ink">Streaks and weekly goals</h3>
              <p className="mt-1.5 text-[15px] text-muted">One lesson a day keeps the streak alive.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Most enrolled */}
      <section aria-labelledby="home-popular" className="mx-auto w-full max-w-[1100px] px-6 pb-24">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="home-popular" className="text-[clamp(1.7rem,3.2vw,2.25rem)] font-bold tracking-[-0.02em] text-ink">
              Most enrolled
            </h2>
            <p className="mt-2 text-muted">Every course has a free first lesson.</p>
          </div>
          <Link to="/search" className={btnQuiet}>
            All courses
          </Link>
        </div>
        {failed ? (
          <div className={`${card} flex flex-wrap items-center justify-between gap-4 border-dashed p-6`}>
            <p className="text-muted">Courses couldn't load. The server may still be waking up.</p>
            <button type="button" onClick={load} className={btnQuiet}>
              Try again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {popular === null
              ? [0, 1, 2, 3].map((i) => (
                  <div key={i} className={`${card} flex flex-col gap-3 p-4`} aria-hidden="true">
                    <div className="skeleton aspect-video w-full" />
                    <div className="skeleton h-5 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                  </div>
                ))
              : popular.map((course) => <CourseCard key={course._id} course={course} />)}
          </div>
        )}
      </section>

      {/* Lesson tools tabs */}
      <section aria-labelledby="home-simpler" className="mx-auto w-full max-w-[1100px] px-6 pb-24">
        <h2 id="home-simpler" className="text-[clamp(1.7rem,3.2vw,2.25rem)] font-bold tracking-[-0.02em] text-ink">
          A simpler way to learn
        </h2>
        <p className="mb-6 mt-2 text-muted">Everything happens on the lesson page.</p>
        <div role="tablist" aria-label="Lesson tools" className="inline-flex flex-wrap gap-1 rounded-xl border border-ink/10 bg-surface p-1">
          {TABS.map((x, i) => (
            <button
              key={x.label}
              type="button"
              role="tab"
              id={`tab-${i}`}
              aria-selected={i === tab}
              aria-controls="tab-panel"
              onClick={() => setTab(i)}
              className={`min-h-[40px] rounded-lg px-3.5 text-sm font-semibold transition-colors ${i === tab ? "bg-raised text-ink" : "text-muted hover:text-ink"}`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <div id="tab-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-7 flex flex-wrap items-center gap-8">
          <div className="flex flex-[1_1_340px] flex-col gap-5">
            {t.points.map(([h, b]) => (
              <div key={h}>
                <h3 className="text-[17px] font-bold text-ink">{h}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{b}</p>
              </div>
            ))}
          </div>
          <div className={`${card} flex min-w-0 flex-[1_1_520px] flex-col gap-3 p-4`} aria-hidden="true">
            <div className="grid aspect-[16/7] place-items-center rounded-lg border border-ink/10 bg-bg">
              <span className="btn-grad grid h-14 w-14 place-items-center rounded-full">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" fill="currentColor" />
                </svg>
              </span>
            </div>
            <p className="font-bold text-ink">{t.title}</p>
            {t.rows.map((r) => (
              <span key={r} className="rounded-lg bg-raised px-3 py-2.5 text-sm text-ink/85">
                {r}
              </span>
            ))}
          </div>
        </div>
      </section>

      <ReviewSlider />

      {/* Pricing */}
      <section aria-labelledby="home-pricing" className="mx-auto w-full max-w-[1100px] px-6 py-24">
        <h2 id="home-pricing" className="text-[clamp(1.7rem,3.2vw,2.25rem)] font-bold tracking-[-0.02em] text-ink">
          Simple, fair pricing
        </h2>
        <p className="mb-7 mt-2 text-muted">No subscription. Pay once for each course you want.</p>
        <div className="grid max-w-[860px] gap-4 md:grid-cols-2">
          <div className={`${card} flex flex-col gap-3.5 p-6`}>
            <h3 className="text-lg font-bold text-ink">For learners</h3>
            <p className="text-sm text-muted">Free account</p>
            <p className="text-[34px] font-extrabold text-ink">
              {lowestPrice ? `From ${formatINR(lowestPrice)}` : "Pay per course"}
              {lowestPrice && <span className="ml-1.5 text-[15px] font-medium text-muted">per course</span>}
            </p>
            <Link to="/signup" className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-ink px-5 font-bold text-bg">
              Create a free account
            </Link>
            <ul className="flex flex-col gap-2 text-sm text-ink/85">
              {["Lifetime access to courses you buy", "Notes and Q&A on every lesson", "Streaks, goals and certificates", "Discount codes and receipts"].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="sn-grad-border">
            <div className="flex h-full flex-col gap-3.5 rounded-[13px] bg-surface p-6">
              <h3 className="flex items-center justify-between text-lg font-bold text-ink">
                For instructors
                <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs font-semibold">Free to publish</span>
              </h3>
              <p className="text-sm text-muted">Teach what you know</p>
              <p className="text-[34px] font-extrabold text-ink">
                ₹0 <span className="text-[15px] font-medium text-muted">to start</span>
              </p>
              <Link to="/signup?role=instructor" className={btnGrad}>
                Start teaching
              </Link>
              <ul className="flex flex-col gap-2 text-sm text-ink/85">
                {["Course stats and lesson completion", "Answer questions and reply to reviews", "Announcements and discount codes", "Reviewed by our team before going live"].map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="home-faq" className="mx-auto w-full max-w-[1100px] px-6 pb-24">
        <h2 id="home-faq" className="text-[clamp(1.7rem,3.2vw,2.25rem)] font-bold tracking-[-0.02em] text-ink">
          Frequently asked questions
        </h2>
        <p className="mb-7 mt-2 text-muted">
          Can't find an answer?{" "}
          <Link to="/contact" className="font-semibold text-accent-text underline-offset-2 hover:underline">
            Write to us
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-7">
          <div role="tablist" aria-orientation="vertical" aria-label="Question topics" className="flex flex-[0_1_280px] flex-col gap-1.5">
            {FAQ.map((f, i) => (
              <button
                key={f.topic}
                type="button"
                role="tab"
                id={`faq-tab-${i}`}
                aria-selected={i === topic}
                aria-controls="faq-panel"
                onClick={() => setTopic(i)}
                className={`min-h-[46px] rounded-xl border px-3.5 text-left text-sm font-semibold transition-colors ${i === topic ? "border-ink/20 bg-raised text-ink" : "border-ink/10 bg-surface text-muted hover:text-ink"}`}
              >
                {f.topic}
              </button>
            ))}
          </div>
          <div id="faq-panel" role="tabpanel" aria-labelledby={`faq-tab-${topic}`} className="flex flex-[1_1_460px] flex-col">
            {FAQ[topic].items.map(([q, a]) => (
              <details key={q} className="group border-b border-ink/10 px-1 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {q}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p className="mt-2.5 leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default Home;
