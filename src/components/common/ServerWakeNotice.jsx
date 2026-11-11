import React, { useEffect, useState } from "react";
import { onSlowRequests } from "../../services/apiconnector";

/**
 * The free backend sleeps after 15 idle minutes and takes up to a minute to wake.
 * When a request is still waiting after a few seconds, say so instead of looking broken.
 */
export default function ServerWakeNotice() {
  const [slow, setSlow] = useState(false);
  useEffect(() => onSlowRequests(setSlow), []);

  if (!slow) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,440px)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-[var(--shadow-pop)]"
    >
      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-accent" />
      <span>
        <strong className="font-semibold">Waking up the server…</strong>{" "}
        <span className="text-muted">The first load after a quiet spell can take up to a minute.</span>
      </span>
    </div>
  );
}
