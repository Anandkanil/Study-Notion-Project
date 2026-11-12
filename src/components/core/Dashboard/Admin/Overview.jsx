import React from "react";
import { Link } from "react-router-dom";

import { formatINR } from "../../../../utils/formatINR";
import { ColumnChart, RankedBars } from "./charts";
import { LoadFailed, PageHeader, fullName, shortDate, useAdminLoad } from "./shared";

const MONTH = (y, m, style) => new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: style, year: style === "long" ? "numeric" : undefined, timeZone: "UTC" });
const rupees = (v) => formatINR(v) || "₹0";
const compactRupees = (v) => (v >= 1000 ? `₹${(v / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}K` : `₹${v}`);
const count = (v) => v.toLocaleString("en-IN");

const Stat = ({ label, value, hint, to }) => {
  const body = (
    <>
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </>
  );
  return to ? (
    <Link to={to} className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:bg-raised">
      {body}
    </Link>
  ) : (
    <div className="rounded-2xl border border-line bg-surface p-5">{body}</div>
  );
};

export default function AdminOverview() {
  const [{ status, data }, load] = useAdminLoad("/overview");

  if (status === "failed") return <LoadFailed what="The overview" onRetry={load} />;

  if (!data) {
    return (
      <div role="status" aria-label="Loading the overview" className="flex flex-col gap-6">
        <div className="skeleton h-9 w-56" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    );
  }

  const { totals, months, topCourses, recentPurchases } = data;
  const revenueSeries = months.map((m) => ({
    key: `${m.year}-${m.month}`,
    label: MONTH(m.year, m.month, "short"),
    full: MONTH(m.year, m.month, "long"),
    value: m.revenue,
    extra: `${m.orders} ${m.orders === 1 ? "order" : "orders"}`,
  }));
  const signupSeries = months.map((m) => ({
    key: `${m.year}-${m.month}`,
    label: MONTH(m.year, m.month, "short"),
    full: MONTH(m.year, m.month, "long"),
    value: m.signups,
  }));
  const thisMonth = months[months.length - 1];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Admin overview">Sales, learners and courses across StudyNotion.</PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Revenue" value={rupees(totals.revenue)} hint={`${rupees(thisMonth.revenue)} this month`} to="/dashboard/admin/purchases" />
        <Stat label="Orders" value={count(totals.orders)} hint={`${thisMonth.orders} this month`} to="/dashboard/admin/purchases" />
        <Stat label="Students" value={count(totals.students)} hint={`${count(totals.instructors)} instructors`} to="/dashboard/admin/users" />
        <Stat label="Published courses" value={count(totals.publishedCourses)} hint={totals.pendingCourses ? `${totals.pendingCourses} waiting for your review` : `${totals.draftCourses} in draft`} to="/dashboard/admin/courses" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ColumnChart title="Revenue" subtitle="By month, last 12 months" data={revenueSeries} format={rupees} tickFormat={compactRupees} emptyText="No sales in the last 12 months yet." />
        <ColumnChart title="New students" subtitle="Sign-ups by month, last 12 months" data={signupSeries} format={count} emptyText="No new students in the last 12 months." />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RankedBars
          title="Top courses"
          subtitle="By revenue, all time"
          items={topCourses.map((c) => ({ key: String(c.courseId), label: c.courseName, value: c.revenue, extra: `${c.sales} ${c.sales === 1 ? "sale" : "sales"}` }))}
          format={rupees}
          emptyText="Course sales will show here."
        />

        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-medium text-ink">Recent purchases</h2>
            <Link to="/dashboard/admin/purchases" className="text-sm font-semibold text-accent-text underline-offset-4 hover:underline">
              See all
            </Link>
          </div>
          {recentPurchases.length === 0 ? (
            <p className="py-8 text-center text-muted">Purchases will show here.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {recentPurchases.map((p) => (
                <li key={p.orderId} className="flex items-center gap-3 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{p.courses.map((c) => c.courseName).join(", ")}</p>
                    <p className="truncate text-sm text-muted">
                      {p.user ? (
                        <Link to={`/dashboard/admin/users/${p.user._id}`} className="hover:text-ink hover:underline">
                          {fullName(p.user)}
                        </Link>
                      ) : (
                        "Deleted account"
                      )}{" "}
                      · {shortDate(p.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-ink">{rupees(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
