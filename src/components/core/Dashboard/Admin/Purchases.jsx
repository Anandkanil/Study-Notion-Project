import React, { useState } from "react";
import { Link } from "react-router-dom";

import { formatINR } from "../../../../utils/formatINR";
import { Button, EmptyState } from "../../../ui";
import { LoadFailed, PageHeader, Pager, ReasonDialog, RowsSkeleton, fullName, shortDate, useAdminApi, useAdminLoad, useCsvDownload, withToast } from "./shared";

export default function AdminPurchases() {
  const [page, setPage] = useState(1);
  const [{ status, data, meta }, load] = useAdminLoad("/purchases", { page }, [page]);
  const api = useAdminApi();
  const download = useCsvDownload();
  const [refunding, setRefunding] = useState(null);

  const refund = async (p, reason) => {
    const res = await withToast(api("POST", `/purchases/${p.orderId}/refund`, { reason }), { loading: "Refunding through Razorpay…", fallbackError: "The refund couldn't be completed." });
    if (res) {
      setRefunding(null);
      load();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sales"
        actions={
          <Button variant="secondary" onClick={() => download("purchases")}>
            Download CSV
          </Button>
        }
      >{meta ? `${meta.total.toLocaleString("en-IN")} ${meta.total === 1 ? "order" : "orders"}, newest first.` : "Every order on StudyNotion."}</PageHeader>

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
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Buyer</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Courses</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Payment ID</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
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
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink">
                        <span className={p.refund ? "text-muted line-through" : ""}>{formatINR(p.amount)}</span>
                        {p.coupon?.code && <p className="text-xs font-normal text-muted">{p.coupon.code} −{p.coupon.percentOff}%</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {p.refund ? (
                          <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-muted" title={p.refund.reason}>
                            Refunded {shortDate(p.refund.at)}
                          </span>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => setRefunding(p)}>
                            Refund
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={meta.page} pages={meta.pages} onPage={setPage} />
          </>
        )}
      </div>
      {refunding && (
        <ReasonDialog
          title={`Refund ${formatINR(refunding.amount)}?`}
          description={`Razorpay returns the full amount to ${fullName(refunding.user)}, and they lose access to ${refunding.courses.map((c) => c.courseName).join(", ")}. This can't be undone.`}
          label="Reason for the refund"
          placeholder="e.g. Bought the wrong course"
          confirmText="Refund"
          danger
          onCancel={() => setRefunding(null)}
          onConfirm={(reason) => refund(refunding, reason)}
        />
      )}
    </div>
  );
}
