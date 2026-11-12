import React, { useState } from "react";
import { Link } from "react-router-dom";

import { formatINR } from "../../../../utils/formatINR";
import { EmptyState } from "../../../ui";
import { LoadFailed, PageHeader, Pager, RowsSkeleton, fullName, shortDate, useAdminLoad } from "./shared";

export default function AdminPurchases() {
  const [page, setPage] = useState(1);
  const [{ status, data, meta }, load] = useAdminLoad("/purchases", { page }, [page]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Purchases">{meta ? `${meta.total.toLocaleString("en-IN")} ${meta.total === 1 ? "order" : "orders"}, newest first.` : "Every order on StudyNotion."}</PageHeader>

      <div aria-live="polite" className="flex flex-col gap-4">
        {status === "failed" ? (
          <LoadFailed what="Purchases" onRetry={load} />
        ) : !data ? (
          <RowsSkeleton label="Loading purchases" />
        ) : data.length === 0 ? (
          <EmptyState title="No purchases yet">Orders appear here as soon as a payment is confirmed.</EmptyState>
        ) : (
          <>
            <div className={`overflow-x-auto rounded-2xl border border-line bg-surface ${status === "loading" ? "opacity-60" : ""}`}>
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Buyer</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Courses</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Payment ID</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.orderId} className="border-t border-line align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-ink">{shortDate(p.createdAt)}</td>
                      <td className="px-4 py-3">
                        {p.user ? (
                          <Link to={`/dashboard/admin/users/${p.user._id}`} className="font-semibold text-ink hover:underline">
                            {fullName(p.user)}
                          </Link>
                        ) : (
                          <span className="text-muted">Deleted account</span>
                        )}
                        {p.user?.email && <p className="text-muted">{p.user.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-ink">{p.courses.map((c) => c.courseName).join(", ")}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">{p.paymentId}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">{formatINR(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={meta.page} pages={meta.pages} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
