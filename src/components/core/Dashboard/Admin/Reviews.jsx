import React, { useState } from "react";
import { Link } from "react-router-dom";

import { Button, EmptyState } from "../../../ui";
import { LoadFailed, PageHeader, Pager, RowsSkeleton, Segmented, fullName, shortDate, useAdminApi, useAdminLoad, withToast } from "./shared";

export default function AdminReviews() {
  const api = useAdminApi();
  const [show, setShow] = useState("all");
  const [page, setPage] = useState(1);
  const [{ status, data, meta }, load] = useAdminLoad("/reviews", { show, page }, [show, page]);

  const toggle = async (r) => {
    const res = await withToast(api("PATCH", `/reviews/${r._id}`, { hidden: !r.hidden }), { loading: r.hidden ? "Restoring…" : "Hiding…", fallbackError: "The review couldn't be updated." });
    if (res) load();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reviews">Hide abusive or fake reviews. A hidden review isn't shown on the course page and doesn't count towards its rating; you can restore it any time.</PageHeader>
      <Segmented
        label="Show"
        value={show}
        onChange={(v) => {
          setShow(v);
          setPage(1);
        }}
        options={[["all", "All reviews"], ["hidden", "Hidden"]]}
      />
      <div aria-live="polite" className="flex flex-col gap-4">
        {status === "failed" ? (
          <LoadFailed what="Reviews" onRetry={load} />
        ) : !data ? (
          <RowsSkeleton label="Loading reviews" />
        ) : data.length === 0 ? (
          <EmptyState title={show === "hidden" ? "No hidden reviews" : "No reviews yet"}>{show === "hidden" ? "Reviews you hide appear here." : "Reviews appear here as students rate courses."}</EmptyState>
        ) : (
          <>
            <ul className={`flex flex-col gap-3 ${status === "loading" ? "opacity-60" : ""}`}>
              {data.map((r) => (
                <li key={r._id} className={`flex flex-wrap items-start gap-4 rounded-2xl border border-line bg-surface p-4 ${r.hidden ? "opacity-70" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-semibold text-ink">{fullName(r.user)}</span>
                      <span className="text-muted">
                        {"★".repeat(r.rating)}
                        <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                      </span>
                      <span className="text-muted">· {shortDate(r.createdAt)} ·</span>
                      {r.course ? (
                        <Link to={`/courses/${r.course._id}`} className="text-muted hover:text-ink hover:underline">
                          {r.course.courseName}
                        </Link>
                      ) : (
                        <span className="text-muted">Deleted course</span>
                      )}
                      {r.hidden && <span className="rounded-full border border-line px-2 text-xs font-semibold text-muted">Hidden</span>}
                    </p>
                    {r.review && <p className="mt-1 whitespace-pre-line text-ink">{r.review}</p>}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => toggle(r)}>
                    {r.hidden ? "Restore" : "Hide"}
                  </Button>
                </li>
              ))}
            </ul>
            <Pager page={meta.page} pages={meta.pages} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
