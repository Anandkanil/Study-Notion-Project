import React, { useId } from "react";
import { Link } from "react-router-dom";

// The StudyNotion mark: an open book (study) with a spark above it (a notion, an idea),
// white on the blue-to-violet gradient tile. Paths are on a 64×64 grid.
export const BOOK_PATH = "M32 25c-4.5-3.2-9.6-4.2-15.5-3.8v24.6c5.9-.4 11 .6 15.5 3.8 4.5-3.2 9.6-4.2 15.5-3.8V21.2c-5.9-.4-11 .6-15.5 3.8zM32 25v24.6";
export const SPARK_PATH = "M32 7.5l1.6 4.2 4.2 1.6-4.2 1.6L32 19.1l-1.6-4.2-4.2-1.6 4.2-1.6z";

export function LogoMark({ size = 32, className = "" }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={`sn-g-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5C77DB" />
          <stop offset="1" stopColor="#AC84EB" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#sn-g-${id})`} />
      <path d={BOOK_PATH} fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d={SPARK_PATH} fill="#fff" />
    </svg>
  );
}

/** StudyNotion wordmark: the mark plus the name; follows the theme. */
export default function Logo({ to = "/", className = "", showName = true }) {
  return (
    <Link to={to} aria-label="StudyNotion home" className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={32} />
      {showName && <span className="text-xl font-bold tracking-tight text-ink">StudyNotion</span>}
    </Link>
  );
}
