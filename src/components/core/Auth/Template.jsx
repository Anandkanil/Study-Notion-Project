import React from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

const POINTS = [
  "Courses in web development, cloud, machine learning, UI/UX and security",
  "Pay once with UPI, card or net banking — no subscription",
  "Your progress saves after every lesson, on any device",
];

/** Two-column layout shared by Log in and Sign up. */
export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-12 px-6 py-12 md:grid-cols-[minmax(0,460px)_1fr] md:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-[2.1rem]">{title}</h1>
        {subtitle && <p className="text-lg text-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>

      <aside aria-label="Why StudyNotion" className="hidden rounded-3xl border border-line bg-surface p-8 md:block">
        <div className="rounded-2xl bg-[rgb(10_10_10)] p-6" aria-hidden="true">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M8 5l12 7-12 7z" fill="rgb(15 15 15)" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[#ECEAF7]">Resume at 12:40</p>
              <div className="mt-2 h-1.5 rounded bg-[#2E3566]">
                <div className="h-full w-[58%] rounded bg-accent" />
              </div>
            </div>
          </div>
        </div>
        <ul className="mt-8 flex flex-col gap-4">
          {POINTS.map((p) => (
            <li key={p} className="flex gap-3 text-ink">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="11" className="fill-accent/20" />
                <path d="M7 12.5l3.2 3.2L17 9" fill="none" className="stroke-accent-text" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {p}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

const Template = ({ title, desc1, formType }) => (
  <AuthLayout title={title} subtitle={desc1}>
    {formType === "signup" ? <SignupForm /> : <LoginForm />}
  </AuthLayout>
);

export default Template;
