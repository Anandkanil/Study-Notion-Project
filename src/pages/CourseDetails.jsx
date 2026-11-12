import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import copy from "copy-to-clipboard";
import toast from "react-hot-toast";

import Footer from "../components/common/Footer";
import WishlistButton from "../components/common/WishlistButton";
import PreviewModal from "../components/core/Course/PreviewModal";
import DiscountCode from "../components/common/DiscountCode";
import { categorySlug } from "../components/common/Navbar";
import { Button, EmptyState, buttonClass } from "../components/ui";
import { buyCourse } from "../services/operations/studentFeaturesAPI";
import { apiConnector } from "../services/apiconnector";
import { courseEndpoints } from "../services/apis";
import { formattedDate } from "../utils/dateFormatter";
import GetAvgRating from "../utils/avgRating";
import { ACCOUNT_TYPE } from "../utils/constants";
import { formatINR } from "../utils/formatINR";
import { addToCart } from "../slices/cartSlice";

const REVIEWS_SHOWN = 6;

function Reviews({ reviews, average }) {
  const [showAll, setShowAll] = useState(false);
  const list = (reviews || []).filter((r) => r && r.rating);
  const counts = [5, 4, 3, 2, 1].map((n) => [n, list.filter((r) => Math.round(r.rating) === n).length]);
  const shown = showAll ? list : list.slice(0, REVIEWS_SHOWN);

  return (
    <section aria-labelledby="cd-reviews">
      <h2 id="cd-reviews" className="font-display text-2xl font-medium text-ink">
        Reviews
      </h2>
      {list.length === 0 ? (
        <p className="mt-4 text-muted">No reviews yet. Learners can rate the course once they've started it.</p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-8 rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-col items-start gap-1">
              <span className="font-display text-4xl font-semibold text-ink">{average.toFixed(1)}</span>
              <Stars value={average} />
              <span className="text-sm text-muted">
                {list.length} {list.length === 1 ? "rating" : "ratings"}
              </span>
            </div>
            <ul className="flex min-w-[200px] flex-1 flex-col gap-1.5" aria-label="Ratings by stars">
              {counts.map(([n, c]) => (
                <li key={n} className="flex items-center gap-3 text-sm text-muted">
                  <span className="w-12 shrink-0">{n} {n === 1 ? "star" : "stars"}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(c / list.length) * 100}%` }} />
                  </span>
                  <span className="w-6 shrink-0 text-right tabular-nums">{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <ul className="mt-6 flex flex-col divide-y divide-line">
            {shown.map((r) => {
              const name = [r.user?.firstName, r.user?.lastName].filter(Boolean).join(" ") || "StudyNotion learner";
              return (
                <li key={r._id} className="flex gap-4 py-5 first:pt-0">
                  <img
                    src={r.user?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                      <span className="sr-only">Rated {r.rating} out of 5.</span>
                      <Stars value={r.rating} size={14} />
                      {r.createdAt && <span>{formattedDate(r.createdAt)}</span>}
                    </p>
                    {r.review && <p className="mt-2 max-w-prose whitespace-pre-line text-ink">{r.review}</p>}
                    {r.reply?.text && (
                      <div className="mt-3 max-w-prose border-l-2 border-accent pl-4">
                        <p className="text-sm font-semibold text-muted">Reply from the instructor{r.reply.at ? ` · ${formattedDate(r.reply.at)}` : ""}</p>
                        <p className="mt-1 whitespace-pre-line text-ink">{r.reply.text}</p>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {list.length > REVIEWS_SHOWN && (
            <Button variant="secondary" className="mt-2" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer reviews" : `Show all ${list.length} reviews`}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

const toLines = (value) =>
  (Array.isArray(value) ? value.join("\n") : value || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean);

const fmtDuration = (sec) => {
  const s = parseInt(sec, 10) || 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

function Stars({ value, size = 18 }) {
  const full = Math.round(value);
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" className={n <= full ? "fill-accent" : "fill-line"}>
          <path d="M12 2l3 7 7.5.6-5.7 4.9 1.8 7.5L12 18l-6.6 4 1.8-7.5L1.5 9.6 9 9z" />
        </svg>
      ))}
    </span>
  );
}

const CourseDetails = () => {
  const { token } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.profile);
  const { cart } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId } = useParams();

  const [state, setState] = useState({ status: "loading" });
  const [open, setOpen] = useState({});
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await apiConnector("POST", courseEndpoints.COURSE_DETAILS_API, { courseId });
      if (!res.data?.success) throw new Error("Not found");
      setState({ status: "ready", data: res.data.data });
      const first = res.data.data.courseDetails?.courseContent?.[0]?._id;
      if (first) setOpen({ [first]: true });
    } catch (error) {
      setState({ status: error?.response?.status === 404 || error?.response?.status === 400 ? "notfound" : "error" });
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const course = state.data?.courseDetails;

  // Phones: once the price card scrolls away, keep price + main action in a bottom bar
  const [previewOpen, setPreviewOpen] = useState(false);
  const [discount, setDiscount] = useState(null);
  const mobileCardRef = useRef(null);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const el = mobileCardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [state.status]);

  useEffect(() => {
    if (course?.courseName) document.title = `${course.courseName} · StudyNotion`;
  }, [course?.courseName]);

  const stats = useMemo(() => {
    if (!course) return null;
    const lectures = (course.courseContent || []).reduce((n, s) => n + (s.subSection?.length || 0), 0);
    return {
      rating: GetAvgRating(course.ratingAndReviews),
      ratings: course.ratingAndReviews?.length || 0,
      students: course.studentsEnrolled?.length || 0,
      lectures,
      sections: course.courseContent?.length || 0,
    };
  }, [course]);

  if (state.status === "loading") {
    return (
      <div role="status" aria-label="Loading course" className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-12 w-4/5" />
          <div className="skeleton h-5 w-full" />
          <div className="skeleton h-5 w-2/3" />
        </div>
        <div className="skeleton aspect-[4/5] w-full rounded-2xl" />
      </div>
    );
  }

  if (state.status !== "ready") {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
          {state.status === "notfound" ? (
            <EmptyState as="h1" title="This course isn't available" action={<Link to="/" className={buttonClass("primary")}>Browse courses</Link>}>
              It may have been removed by its instructor, or the link is incomplete.
            </EmptyState>
          ) : (
            <EmptyState as="h1" title="The course couldn't load" action={<Button variant="secondary" onClick={load}>Try again</Button>}>
              The server may still be waking up. This usually takes under a minute.
            </EmptyState>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  const { instructor, category } = course;
  // Only student accounts can buy; instructors and admins get a clear message instead
  const isInstructorUser = user && user.accountType !== ACCOUNT_TYPE.STUDENT;
  const isOwner = user?._id && String(instructor?._id) === String(user._id);
  const isEnrolled = Boolean(user?._id && course.studentsEnrolled?.some((s) => String(s?._id ?? s) === String(user._id)));
  const inCart = cart?.some((c) => c._id === course._id);
  const learn = toLines(course.whatYouWillLearn);
  const requirements = (course.instructions || []).map((s) => String(s).trim()).filter(Boolean);
  const sections = course.courseContent || [];
  const allOpen = sections.length > 0 && sections.every((s) => open[s._id]);
  const instructorName = [instructor?.firstName, instructor?.lastName].filter(Boolean).join(" ");

  const goLogin = () => navigate("/login", { state: { from: location.pathname } });

  const handleBuy = async () => {
    if (!token) return goLogin();
    if (isInstructorUser) return toast.error(`${user.accountType} accounts can't buy courses. Log in with a student account.`);
    setBuying(true);
    try {
      await buyCourse(token, [courseId], user, navigate, dispatch, discount?.code);
    } finally {
      setBuying(false);
    }
  };
  const handleAddToCart = () => {
    if (!token) return goLogin();
    if (isInstructorUser) return toast.error(`${user.accountType} accounts can't buy courses. Log in with a student account.`);
    dispatch(addToCart(course));
  };
  const handleShare = () => {
    copy(window.location.href);
    toast.success("Course link copied");
  };

  const firstLesson = sections.find((s) => s.subSection?.length);
  const startHref = firstLesson ? `/view-course/${course._id}/section/${firstLesson._id}/sub-section/${firstLesson.subSection[0]._id}` : "/dashboard/enrolled-courses";

  const purchaseCard = (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface lg:sticky lg:top-24">
      <div className="relative">
        <img src={course.thumbnail} alt="" className="aspect-video w-full object-cover" />
        {firstLesson && !isEnrolled && !isOwner && (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 font-bold text-white transition-colors hover:bg-black/50"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-[#14172E] shadow-lg" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5l12 7-12 7z" />
              </svg>
            </span>
            Watch free preview
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 p-5">
        {discount ? (
          <p className="flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl font-semibold text-ink">{formatINR(discount.newPrice)}</span>
            <span className="text-lg text-muted line-through">{formatINR(course.price)}</span>
          </p>
        ) : (
          <p className="font-display text-3xl font-semibold text-ink">{formatINR(course.price)}</p>
        )}
        {isEnrolled ? (
          <Link to={startHref} className={buttonClass("primary", "lg")}>
            Go to course
          </Link>
        ) : isOwner ? (
          <Link to={`/dashboard/edit-course/${course._id}`} className={buttonClass("primary", "lg")}>
            Edit your course
          </Link>
        ) : (
          <>
            <Button size="lg" onClick={handleBuy} loading={buying} loadingText="Opening checkout…">
              Buy now
            </Button>
            {inCart ? (
              <Link to="/dashboard/cart" className={buttonClass("secondary", "lg")}>
                In your cart — view cart
              </Link>
            ) : (
              <Button size="lg" variant="secondary" onClick={handleAddToCart}>
                Add to cart
              </Button>
            )}
            <WishlistButton variant="inline" courseId={course._id} courseName={course.courseName} />
            {!isInstructorUser && <DiscountCode courseIds={[course._id]} applied={discount} onApply={setDiscount} />}
          </>
        )}
        <p className="text-center text-sm text-muted">One-time payment · Lifetime access</p>
        <button type="button" onClick={handleShare} className="mx-auto rounded-lg px-3 py-2 text-sm font-semibold text-accent-text hover:bg-raised">
          Copy link to share
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-4">
            <nav aria-label="Breadcrumb" className="text-sm text-muted">
              <ol className="flex flex-wrap gap-2">
                <li>
                  <Link to="/" className="hover:text-ink">
                    Home
                  </Link>
                </li>
                {category?.name && (
                  <>
                    <li aria-hidden="true">/</li>
                    <li>
                      <Link to={`/catalog/${categorySlug(category.name)}`} className="hover:text-ink">
                        {category.name}
                      </Link>
                    </li>
                  </>
                )}
              </ol>
            </nav>
            <h1 className="font-display text-[clamp(2rem,4vw,2.8rem)] font-bold leading-tight text-ink">{course.courseName}</h1>
            <p className="max-w-2xl text-lg text-muted">{course.courseDescription}</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-ink">
              {stats.ratings > 0 ? (
                <span className="flex items-center gap-2" aria-label={`Rated ${stats.rating} out of 5 from ${stats.ratings} ratings`}>
                  <span className="font-bold">{stats.rating.toFixed(1)}</span>
                  <Stars value={stats.rating} />
                  <span className="text-muted">({stats.ratings})</span>
                </span>
              ) : (
                <span className="text-muted">No ratings yet</span>
              )}
              <span className="text-muted">
                {stats.students} {stats.students === 1 ? "student" : "students"}
              </span>
            </div>
            <p className="text-muted">
              Created by <span className="font-semibold text-ink">{instructorName}</span> · Updated {formattedDate(course.updatedAt || course.createdAt)} · English
            </p>
          </div>
          <div className="lg:hidden" ref={mobileCardRef}>
            {purchaseCard}
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-12">
          {learn.length > 0 && (
            <section aria-labelledby="cd-learn" className="rounded-2xl border border-line bg-surface p-6">
              <h2 id="cd-learn" className="font-display text-2xl font-medium text-ink">
                What you'll learn
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {learn.map((l, i) => (
                  <li key={i} className="flex gap-3 text-ink">
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 shrink-0">
                      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" className="stroke-success" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {l}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="cd-content">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="cd-content" className="font-display text-2xl font-medium text-ink">
                  Course content
                </h2>
                <p className="mt-1 text-muted">
                  {stats.sections} {stats.sections === 1 ? "section" : "sections"} · {stats.lectures} {stats.lectures === 1 ? "lesson" : "lessons"}
                  {state.data.totalDuration ? ` · ${state.data.totalDuration} total` : ""}
                </p>
              </div>
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => setOpen(allOpen ? {} : Object.fromEntries(sections.map((s) => [s._id, true])))}
                  className="rounded-lg px-3 py-2 font-semibold text-accent-text hover:bg-raised"
                >
                  {allOpen ? "Collapse all" : "Expand all"}
                </button>
              )}
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-line">
              {sections.length === 0 && <p className="bg-surface p-5 text-muted">The instructor hasn't added lessons yet.</p>}
              {sections.map((s, i) => (
                <details
                  key={s._id}
                  open={!!open[s._id]}
                  onToggle={(e) => {
                    const isOpen = e.currentTarget.open;
                    setOpen((o) => (o[s._id] === isOpen ? o : { ...o, [s._id]: isOpen }));
                  }}
                  className={`group bg-surface ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-semibold text-ink hover:bg-raised">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-90">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                    <span className="flex-1">{s.sectionName}</span>
                    <span className="text-sm font-medium text-muted">
                      {s.subSection?.length || 0} {s.subSection?.length === 1 ? "lesson" : "lessons"}
                    </span>
                  </summary>
                  <ul className="border-t border-line bg-bg/40">
                    {(s.subSection || []).map((ss) => (
                      <li key={ss._id} className="flex items-center gap-3 px-5 py-3 pl-12 text-ink">
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
                          <circle cx="12" cy="12" r="9" fill="none" className="stroke-muted" strokeWidth="2" />
                          <path d="M10 8.5l5 3.5-5 3.5z" className="fill-muted" />
                        </svg>
                        <span className="flex-1">{ss.title}</span>
                        {firstLesson && String(ss._id) === String(firstLesson.subSection[0]._id) && !isEnrolled && (
                          <button type="button" onClick={() => setPreviewOpen(true)} className="rounded-lg px-2 py-1 text-sm font-semibold text-accent-text underline-offset-4 hover:underline">
                            Free preview
                          </button>
                        )}
                        {ss.timeDuration && <span className="text-sm text-muted">{fmtDuration(ss.timeDuration)}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          {requirements.length > 0 && (
            <section aria-labelledby="cd-req">
              <h2 id="cd-req" className="font-display text-2xl font-medium text-ink">
                Before you start
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-6 text-ink marker:text-muted">
                {requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          <Reviews reviews={course.ratingAndReviews} average={stats.rating} />

          <section aria-labelledby="cd-instructor">
            <h2 id="cd-instructor" className="font-display text-2xl font-medium text-ink">
              Your instructor
            </h2>
            <div className="mt-5 flex items-start gap-4">
              <img
                src={instructor?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(instructorName)}`}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover"
              />
              <div>
                <p className="text-lg font-bold text-ink">{instructorName}</p>
                <p className="mt-1 max-w-prose text-muted">{instructor?.additionalDetails?.about || "This instructor hasn't added a bio yet."}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="hidden lg:block">{purchaseCard}</div>
      </div>

      {showBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-muted">{course.courseName}</p>
              <p className="font-display text-xl font-semibold text-ink">{formatINR(discount ? discount.newPrice : course.price)}</p>
            </div>
            {isEnrolled ? (
              <Link to={startHref} className={buttonClass("primary")}>
                Go to course
              </Link>
            ) : isOwner ? (
              <Link to={`/dashboard/edit-course/${course._id}`} className={buttonClass("primary")}>
                Edit course
              </Link>
            ) : (
              <Button onClick={handleBuy} loading={buying} loadingText="Opening…">
                Buy now
              </Button>
            )}
          </div>
        </div>
      )}

      {previewOpen && (
        <PreviewModal
          courseId={course._id}
          onClose={() => setPreviewOpen(false)}
          cta={
            <Button
              onClick={() => {
                setPreviewOpen(false);
                handleBuy();
              }}
            >
              Buy for {formatINR(discount ? discount.newPrice : course.price)}
            </Button>
          }
        />
      )}

      <div className="pb-20 lg:pb-0">
        <Footer />
      </div>
    </div>
  );
};

export default CourseDetails;
