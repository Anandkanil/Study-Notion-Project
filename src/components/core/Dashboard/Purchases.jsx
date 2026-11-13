import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";

import { apiConnector } from "../../../services/apiconnector";
import { studentEndpoints } from "../../../services/apis";
import { formatINR } from "../../../utils/formatINR";
import { Button, EmptyState, buttonClass } from "../../ui";

const dateText = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const timeText = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/** Loads the signed-in student's purchases once. */
function usePurchases() {
  const { token } = useSelector((state) => state.auth);
  const [state, setState] = useState({ status: "loading", list: [] });
  const load = useCallback(async () => {
    setState({ status: "loading", list: [] });
    try {
      const res = await apiConnector("GET", studentEndpoints.PURCHASES_API, null, { Authorization: `Bearer ${token}` });
      setState({ status: "ready", list: res.data?.data || [] });
    } catch (error) {
      console.error("Purchases error:", error);
      setState({ status: "failed", list: [] });
    }
  }, [token]);
  useEffect(() => {
    load();
  }, [load]);
  return [state, load];
}

/** One row per payment, plus one per refund, newest first. */
const entries = (list) =>
  list
    .flatMap((p) => [{ p, isRefund: false, at: p.createdAt }, ...(p.refund ? [{ p, isRefund: true, at: p.refund.at }] : [])])
    .sort((a, b) => new Date(b.at) - new Date(a.at));

const Failed = ({ onRetry }) => (
  <EmptyState title="Your purchases couldn't load" action={<Button variant="secondary" onClick={onRetry}>Try again</Button>}>
    The server may still be waking up. This usually takes under a minute.
  </EmptyState>
);

export default function Purchases() {
  const [{ status, list }, load] = usePurchases();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Purchases</h1>
        <p className="mt-1 text-muted">Every payment and refund, each with its own receipt.</p>
      </div>

      {status === "failed" ? (
        <Failed onRetry={load} />
      ) : status === "loading" ? (
        <div role="status" aria-label="Loading your purchases" className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="No purchases yet" action={<Link to="/" className={buttonClass("primary")}>Browse courses</Link>}>
          Courses you buy appear here, each with a receipt you can download.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries(list).map(({ p, isRefund, at }) => (
            <li key={p.orderId + (isRefund ? "-refund" : "")} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{p.courses.map((c) => c.courseName).join(", ")}</p>
                <p className="mt-1 text-sm text-muted">
                  {isRefund ? `Refund · ${dateText(at)}` : `Payment · ${dateText(at)} · ${p.courses.length} ${p.courses.length === 1 ? "course" : "courses"}`}
                  {!isRefund && p.refund && " · Refunded later"}
                </p>
              </div>
              <p className={`text-lg font-bold tabular-nums ${isRefund ? "text-[rgb(var(--success))]" : "text-ink"}`}>
                {isRefund ? `+${formatINR(p.refund.amount)}` : formatINR(p.amount)}
              </p>
              <Link
                to={`/dashboard/purchases/${p.orderId}${isRefund ? "/refund" : ""}`}
                className={buttonClass("secondary", "sm")}
                aria-label={`${isRefund ? "Refund receipt" : "Receipt"} for ${p.courses.map((c) => c.courseName).join(", ")}`}
              >
                {isRefund ? "Refund receipt" : "Receipt"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Receipt({ refund: isRefund = false }) {
  const { orderId } = useParams();
  const { user } = useSelector((state) => state.profile);
  const [{ status, list }, load] = usePurchases();
  const p = list.find((x) => x.orderId === orderId);

  useEffect(() => {
    if (p) document.title = `${isRefund ? "Refund receipt" : "Receipt"} · ${dateText(isRefund && p.refund ? p.refund.at : p.createdAt)} · StudyNotion`;
  }, [p, isRefund]);

  if (status === "loading") return <div role="status" aria-label="Loading receipt" className="skeleton h-[480px] w-full max-w-3xl rounded-2xl" />;
  if (status === "failed") return <Failed onRetry={load} />;
  if (!p || (isRefund && !p.refund)) {
    return (
      <EmptyState title="Receipt not found" action={<Link to="/dashboard/purchases" className={buttonClass("primary")}>Back to purchases</Link>}>
        This receipt isn't in your account. Check the link, or open it from your purchases.
      </EmptyState>
    );
  }

  const buyer = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  if (isRefund) return <RefundReceipt p={p} buyer={buyer} email={user?.email} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="font-display text-3xl font-bold text-ink">Receipt</h1>
        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard/purchases" className={buttonClass("secondary")}>
            Back to purchases
          </Link>
          <Button onClick={() => window.print()}>Download PDF</Button>
        </div>
      </div>

      {/* Fixed print-friendly colours; prints alone on the page (see #printable rules in index.css) */}
      <section id="printable" aria-label="Payment receipt" className="w-full max-w-3xl rounded-2xl bg-white p-8 text-[#14172E] shadow-[var(--shadow-pop)] print:max-w-none print:rounded-none print:p-12 print:shadow-none sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[#DADCE8] pb-6">
          <div className="flex items-center gap-2.5">
            <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="#0F0F0F" />
              <path d="M14 20h22a8 8 0 0 1 0 16H28a8 8 0 0 0 0 16h22" fill="none" stroke="#AC84EB" strokeWidth="7" strokeLinecap="round" />
            </svg>
            <span className="font-display text-lg font-semibold">StudyNotion</span>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl font-medium">Payment receipt</p>
            <p className="mt-1 text-sm text-[#4A4F6E]">Paid {dateText(p.createdAt)}, {timeText(p.createdAt)}</p>
          </div>
        </div>

        <dl className="grid gap-4 border-b border-[#DADCE8] py-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#4A4F6E]">Billed to</dt>
            <dd className="font-bold">{buyer || "StudyNotion learner"}</dd>
            {user?.email && <dd>{user.email}</dd>}
          </div>
          <div className="sm:text-right">
            <dt className="text-[#4A4F6E]">Order ID</dt>
            <dd className="break-all font-bold">{p.orderId}</dd>
            <dt className="mt-2 text-[#4A4F6E]">Payment ID</dt>
            <dd className="break-all font-bold">{p.paymentId}</dd>
          </div>
        </dl>

        <table className="w-full border-b border-[#DADCE8] text-left text-sm">
          <thead>
            <tr className="text-[#4A4F6E]">
              <th scope="col" className="py-3 font-semibold">Course</th>
              <th scope="col" className="py-3 text-right font-semibold">Price</th>
            </tr>
          </thead>
          <tbody>
            {p.courses.map((c, i) => (
              <tr key={i} className="border-t border-[#EDEEF5]">
                <td className="py-3">{c.courseName}</td>
                <td className="py-3 text-right tabular-nums">{c.price != null ? formatINR(c.price) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {p.coupon?.code && (
          <p className="pt-4 text-sm text-[#4A4F6E]">
            Discount code {p.coupon.code}: {p.coupon.percentOff}% off, already included in the prices above.
          </p>
        )}
        <div className="flex items-baseline justify-between pt-5">
          <span className="font-bold">Total paid</span>
          <span className="font-display text-2xl font-semibold tabular-nums">{formatINR(p.amount)}</span>
        </div>
        {p.refund && (
          <div className="mt-3 flex items-baseline justify-between text-[#4A4F6E]">
            <span>Refunded on {dateText(p.refund.at)}</span>
            <span className="tabular-nums">−{formatINR(p.refund.amount)}</span>
          </div>
        )}
        <p className="mt-6 text-sm text-[#4A4F6E]">
          {p.refund
            ? "Paid online through Razorpay. This order was refunded, so access to these courses has ended. See the refund receipt for details."
            : "Paid online through Razorpay. One-time payment with lifetime access to the courses listed."}
        </p>
      </section>
    </div>
  );
}

const Brand = () => (
  <div className="flex items-center gap-2.5">
    <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0F0F0F" />
      <path d="M14 20h22a8 8 0 0 1 0 16H28a8 8 0 0 0 0 16h22" fill="none" stroke="#AC84EB" strokeWidth="7" strokeLinecap="round" />
    </svg>
    <span className="font-display text-lg font-semibold">StudyNotion</span>
  </div>
);

function RefundReceipt({ p, buyer, email }) {
  const r = p.refund;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="font-display text-3xl font-bold text-ink">Refund receipt</h1>
        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard/purchases" className={buttonClass("secondary")}>
            Back to purchases
          </Link>
          <Button onClick={() => window.print()}>Download PDF</Button>
        </div>
      </div>

      <section id="printable" aria-label="Refund receipt" className="w-full max-w-3xl rounded-2xl bg-white p-8 text-[#14172E] shadow-[var(--shadow-pop)] print:max-w-none print:rounded-none print:p-12 print:shadow-none sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[#DADCE8] pb-6">
          <Brand />
          <div className="text-right">
            <p className="font-display text-2xl font-medium">Refund receipt</p>
            <p className="mt-1 text-sm text-[#4A4F6E]">Refunded {dateText(r.at)}, {timeText(r.at)}</p>
          </div>
        </div>

        <dl className="grid gap-4 border-b border-[#DADCE8] py-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#4A4F6E]">Refunded to</dt>
            <dd className="font-bold">{buyer || "StudyNotion learner"}</dd>
            {email && <dd>{email}</dd>}
            <dt className="mt-2 text-[#4A4F6E]">Original payment</dt>
            <dd>{dateText(p.createdAt)}</dd>
          </div>
          <div className="sm:text-right">
            <dt className="text-[#4A4F6E]">Refund ID</dt>
            <dd className="break-all font-bold">{r.id}</dd>
            <dt className="mt-2 text-[#4A4F6E]">Order ID</dt>
            <dd className="break-all font-bold">{p.orderId}</dd>
            <dt className="mt-2 text-[#4A4F6E]">Payment ID</dt>
            <dd className="break-all font-bold">{p.paymentId}</dd>
          </div>
        </dl>

        <table className="w-full border-b border-[#DADCE8] text-left text-sm">
          <thead>
            <tr className="text-[#4A4F6E]">
              <th scope="col" className="py-3 font-semibold">Course</th>
              <th scope="col" className="py-3 text-right font-semibold">Paid</th>
            </tr>
          </thead>
          <tbody>
            {p.courses.map((c, i) => (
              <tr key={i} className="border-t border-[#EDEEF5]">
                <td className="py-3">{c.courseName}</td>
                <td className="py-3 text-right tabular-nums">{c.price != null ? formatINR(c.price) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-baseline justify-between pt-5">
          <span className="font-bold">Total refunded</span>
          <span className="font-display text-2xl font-semibold tabular-nums">{formatINR(r.amount)}</span>
        </div>
        {r.reason && <p className="mt-4 text-sm"><span className="text-[#4A4F6E]">Reason: </span>{r.reason}</p>}
        <p className="mt-6 text-sm text-[#4A4F6E]">
          Refunded through Razorpay to the card, UPI or account you paid with. It usually arrives in 5–7 working days. Access to the courses listed has ended.
        </p>
      </section>
    </div>
  );
}
