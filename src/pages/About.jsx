import React from "react";
import { Link } from "react-router-dom";
import Footer from "../components/common/Footer";
import ReviewSlider from "../components/common/ReviewSlider";
import { buttonClass } from "../components/ui";

const PRINCIPLES = [
  ["Short lessons", "Courses are split into sections and short videos, so a lesson fits into a commute or a lunch break."],
  ["Progress that follows you", "Every lesson you finish is saved. Come back on any device and resume where you stopped."],
  ["Pay once", "No subscription. Buy a course in rupees with UPI, card or net banking, and it stays in your account."],
];

export default function About() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-4xl px-6 py-16">
          <h1 className="font-display text-[clamp(2.2rem,5vw,3.2rem)] font-bold leading-tight text-ink">
            Practical tech skills, taught one lesson at a time.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            StudyNotion is an online course platform for web development, cloud computing, machine learning, UI/UX and cybersecurity. Instructors build courses from short video lessons; learners buy the courses they need and work through them at their own pace.
          </p>
        </div>
      </section>

      <section aria-labelledby="about-how" className="mx-auto w-full max-w-6xl px-6 py-14">
        <h2 id="about-how" className="font-display text-2xl font-medium text-ink">
          How we think about learning
        </h2>
        <ul className="mt-6 grid gap-5 md:grid-cols-3">
          {PRINCIPLES.map(([title, body]) => (
            <li key={title} className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="text-lg font-bold text-ink">{title}</h3>
              <p className="mt-2 text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="about-cta" className="mx-auto w-full max-w-6xl px-6 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-line bg-surface p-8">
          <div className="max-w-xl">
            <h2 id="about-cta" className="font-display text-2xl font-semibold text-ink">
              Know something worth teaching?
            </h2>
            <p className="mt-2 text-muted">Create an instructor account, build your course and set your own price.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/signup?role=instructor" className={buttonClass("primary", "lg")}>
              Become an instructor
            </Link>
            <Link to="/contact" className={buttonClass("secondary", "lg")}>
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <ReviewSlider />
      <Footer />
    </div>
  );
}
