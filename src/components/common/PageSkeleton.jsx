import React from "react";

/** Placeholder shown while a page's code or data loads. */
export default function PageSkeleton({ label = "Loading page" }) {
  return (
    <div role="status" aria-label={label} className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="skeleton h-10 w-2/3 max-w-xl" />
      <div className="skeleton h-5 w-1/2 max-w-md" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
            <div className="skeleton aspect-video w-full" />
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        ))}
      </div>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
