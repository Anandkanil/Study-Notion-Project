import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { formatINR } from "../../../../utils/formatINR";
import { EmptyState, buttonClass } from "../../../ui";
import { LoadFailed, PageHeader, Pager, ReasonDialog, RowsSkeleton, SearchBox, Segmented, fullName, shortDate, useAdminApi, useAdminLoad, useCsvDownload, useDebounced, withToast } from "./shared";
import { Button } from "../../../ui";

const avatar = (u) => u?.image || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(fullName(u))}`;

const RoleTag = ({ role }) => <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-muted">{role}</span>;
const SuspendedTag = () => <span className="rounded-full border border-danger/50 px-2.5 py-0.5 text-xs font-semibold text-danger">Suspended</span>;

export default function AdminUsers() {
  const [text, setText] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const q = useDebounced(text);
  const params = { q: q.trim().length >= 2 ? q.trim() : undefined, role: role === "all" ? undefined : role, page };
  const [{ status, data, meta }, load] = useAdminLoad("/users", params, [q, role, page]);
  const download = useCsvDownload();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        actions={
          <Button variant="secondary" onClick={() => download("users")}>
            Download CSV
          </Button>
        }
      >{meta ? `${meta.total.toLocaleString("en-IN")} ${meta.total === 1 ? "account" : "accounts"}` : "Students, instructors and admins."}</PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox
          value={text}
          onChange={(v) => {
            setText(v);
            setPage(1);
          }}
          placeholder="Search by name or email"
          label="Search users"
        />
        <Segmented
          label="Role"
          value={role}
          onChange={(v) => {
            setRole(v);
            setPage(1);
          }}
          options={[["all", "All"], ["Student", "Students"], ["Instructor", "Instructors"], ["Admin", "Admins"]]}
        />
      </div>

      <div aria-live="polite" className="flex flex-col gap-4">
        {status === "failed" ? (
          <LoadFailed what="Users" onRetry={load} />
        ) : !data ? (
          <RowsSkeleton label="Loading users" />
        ) : data.length === 0 ? (
          <EmptyState title="No users match">Try another name, email or role.</EmptyState>
        ) : (
          <>
            <ul className={`flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface ${status === "loading" ? "opacity-60" : ""}`}>
              {data.map((u) => (
                <li key={u._id}>
                  <Link to={`/dashboard/admin/users/${u._id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-raised">
                    <img src={avatar(u)} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{fullName(u)}</p>
                      <p className="truncate text-sm text-muted">{u.email}</p>
                    </div>
                    {u.suspended && <SuspendedTag />}
                    <RoleTag role={u.accountType} />
                    <span className="hidden w-28 text-right text-sm text-muted sm:block">Joined {shortDate(u.createdAt)}</span>
                  </Link>
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

export function AdminUserDetail() {
  const { id } = useParams();
  const api = useAdminApi();
  const [{ status, data: u }, load] = useAdminLoad(`/users/${id}`, null, [id]);
  const [asking, setAsking] = useState(false);

  const setSuspended = async (suspended, reason) => {
    const res = await withToast(api("PATCH", `/users/${id}/suspension`, { suspended, reason }), { loading: suspended ? "Suspending…" : "Reactivating…", fallbackError: "The account couldn't be updated." });
    if (res) {
      setAsking(false);
      load();
    }
  };

  if (status === "failed") return <LoadFailed what="This user" onRetry={load} />;
  if (!u) return <RowsSkeleton rows={4} label="Loading user" />;

  const spent = (u.purchases || []).reduce((n, p) => n + (p.amount || 0), 0);

  return (
    <div className="flex flex-col gap-8">
      <Link to="/dashboard/admin/users" className="self-start text-sm font-semibold text-muted hover:text-ink">
        ← All users
      </Link>

      <div className="flex flex-wrap items-center gap-4">
        <img src={avatar(u)} alt="" className="h-16 w-16 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold text-ink">{fullName(u)}</h1>
          <p className="mt-1 text-muted">
            {u.email} · Joined {shortDate(u.createdAt)}
          </p>
        </div>
        {u.suspended && <SuspendedTag />}
        <RoleTag role={u.accountType} />
        {u.accountType !== "Admin" &&
          (u.suspended ? (
            <Button variant="secondary" onClick={() => setSuspended(false)}>
              Reactivate
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setAsking(true)}>
              Suspend
            </Button>
          ))}
      </div>
      {u.suspended && u.suspendedReason && <p className="-mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-ink">Suspended: {u.suspendedReason}</p>}
      {asking && (
        <ReasonDialog
          title={`Suspend ${fullName(u)}?`}
          description="They're logged out straight away and can't log in until you reactivate them. Their data and purchases are kept. They get an email with your reason."
          label="Reason (the user sees this)"
          placeholder="e.g. Repeated spam in course Q&A"
          confirmText="Suspend account"
          danger
          onCancel={() => setAsking(false)}
          onConfirm={(reason) => setSuspended(true, reason)}
        />
      )}

      {u.accountType === "Instructor" ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-medium text-ink">Courses taught ({u.taughtCourses.length})</h2>
          {u.taughtCourses.length === 0 ? (
            <p className="text-muted">No courses yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
              {u.taughtCourses.map((c) => (
                <li key={c._id} className="flex flex-wrap items-center gap-3 p-4">
                  <Link to={`/courses/${c._id}`} className="min-w-0 flex-1 truncate font-semibold text-ink hover:underline">
                    {c.courseName}
                  </Link>
                  <span className="text-sm text-muted">
                    {c.status} · {formatINR(c.price) || "₹0"} · {c.studentsCount} {c.studentsCount === 1 ? "student" : "students"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-medium text-ink">Enrolled courses ({(u.courses || []).length})</h2>
            {(u.courses || []).length === 0 ? (
              <p className="text-muted">Not enrolled in any course.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
                {u.courses.map((c) => (
                  <li key={c._id} className="flex items-center gap-3 p-4">
                    <Link to={`/courses/${c._id}`} className="min-w-0 flex-1 truncate font-semibold text-ink hover:underline">
                      {c.courseName}
                    </Link>
                    <span className="text-sm text-muted">{formatINR(c.price) || "₹0"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-medium text-ink">
              Purchases ({u.purchases.length}){u.purchases.length > 0 && <span className="font-sans text-base text-muted"> · {formatINR(spent)} in total</span>}
            </h2>
            {u.purchases.length === 0 ? (
              <p className="text-muted">No purchases recorded.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
                {u.purchases.map((p) => (
                  <li key={p.orderId} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{p.courses.map((c) => c.courseName).join(", ")}</p>
                      <p className="text-sm text-muted">
                        {shortDate(p.createdAt)} · {p.orderId}
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums text-ink">{formatINR(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Link to="/dashboard/admin/users" className={`${buttonClass("secondary")} self-start`}>
        Back to users
      </Link>
    </div>
  );
}
