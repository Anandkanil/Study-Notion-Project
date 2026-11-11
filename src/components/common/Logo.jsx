import React from "react";
import { Link } from "react-router-dom";

/** StudyNotion wordmark: a "progress path" mark plus the name; follows the theme. */
export default function Logo({ to = "/", className = "" }) {
  return (
    <Link to={to} aria-label="StudyNotion home" className={`flex items-center gap-2.5 ${className}`}>
      <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" className="fill-surface" />
        <rect x="1" y="1" width="62" height="62" rx="13" fill="none" className="stroke-line" strokeWidth="2" />
        <path d="M14 20h22a8 8 0 0 1 0 16H28a8 8 0 0 0 0 16h22" fill="none" className="stroke-accent" strokeWidth="7" strokeLinecap="round" />
      </svg>
      <span className="font-display text-lg font-semibold tracking-tight text-ink">StudyNotion</span>
    </Link>
  );
}
