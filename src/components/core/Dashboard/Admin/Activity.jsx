import React, { useState } from "react";

import { EmptyState } from "../../../ui";
import { LoadFailed, PageHeader, Pager, RowsSkeleton, fullName, useAdminLoad } from "./shared";

const stamp = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function AdminActivity() {
  const [page, setPage] = useState(1);
  const [{ status, data, meta }, load] = useAdminLoad("/logs", { page }, [page]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Activity">Every change made in the admin panel: who did it and when. Entries can't be edited or deleted.</PageHeader>
      <div aria-live="polite" className="flex flex-col gap-4">
        {status === "failed" ? (
          <LoadFailed what="The activity log" onRetry={load} />
        ) : !data ? (
          <RowsSkeleton label="Loading activity" />
        ) : data.length === 0 ? (
          <EmptyState title="Nothing yet">Approvals, refunds, suspensions and other admin changes are recorded here from now on.</EmptyState>
        ) : (
          <>
            <ol className={`flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface ${status === "loading" ? "opacity-60" : ""}`}>
              {data.map((l) => (
                <li key={l._id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 p-4">
                  <time dateTime={l.createdAt} className="w-44 shrink-0 text-sm tabular-nums text-muted">
                    {stamp(l.createdAt)}
                  </time>
                  <p className="min-w-0 flex-1 text-ink">{l.summary}</p>
                  <span className="text-sm text-muted">{fullName(l.admin)}</span>
                </li>
              ))}
            </ol>
            <Pager page={meta.page} pages={meta.pages} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
