import React from "react";
import { useSelector } from "react-redux";
import CourseBuilderForm from "./CourseBuilder/CourseBuilderForm";
import CourseInformationForm from "./CourseInformation/CourseInformationForm";
import PublishCourse from "./PublishCourse";

export const STEPS = [
  { id: 1, title: "Details", tips: ["Use a title that says what learners will be able to do.", "Price in whole rupees; 0 makes the course free.", "Thumbnail: 16:9, around 1024 × 576, under 2 MB.", "Put each benefit on its own line — they're shown as a checklist."] },
  { id: 2, title: "Lessons", tips: ["Group lessons into sections, such as one per topic or week.", "Each lesson is one video with a title and short description.", "Shorter videos (5–15 minutes) are easier to finish and resume."] },
  { id: 3, title: "Publish", tips: ["Drafts are only visible to you.", "Publishing lists the course in its subject's catalog.", "You can edit or unpublish later; enrolled students keep access."] },
];

export function Stepper({ step }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Course setup progress">
      {STEPS.map((s, i) => {
        const done = step > s.id;
        const current = step === s.id;
        return (
          <li key={s.id} aria-current={current ? "step" : undefined} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                done ? "bg-success text-bg" : current ? "bg-accent text-on-accent" : "border border-field text-muted"
              }`}
            >
              {done ? (
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                s.id
              )}
            </span>
            <span className={`whitespace-nowrap font-semibold ${current ? "text-ink" : "text-muted"}`}>
              {s.title}
              <span className="sr-only">{done ? " (done)" : current ? " (current step)" : ""}</span>
            </span>
            {i < STEPS.length - 1 && <span aria-hidden="true" className={`h-px flex-1 ${done ? "bg-success" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export default function RenderSteps() {
  const { step } = useSelector((state) => state.course);
  const current = STEPS.find((s) => s.id === step) || STEPS[0];
  return (
    <div className="grid items-start gap-8 xl:grid-cols-[1fr_300px]">
      <div className="flex min-w-0 flex-col gap-8">
        <Stepper step={step} />
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          {step === 1 && <CourseInformationForm />}
          {step === 2 && <CourseBuilderForm />}
          {step === 3 && <PublishCourse />}
        </div>
      </div>
      <aside aria-labelledby="wizard-tips" className="rounded-2xl border border-line bg-surface p-5 xl:sticky xl:top-24">
        <h2 id="wizard-tips" className="font-semibold text-ink">
          Tips for this step
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted marker:text-accent">
          {current.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
