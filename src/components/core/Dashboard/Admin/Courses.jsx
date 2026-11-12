import React, { useState } from "react";
import { Link } from "react-router-dom";

import ConfirmationModal from "../../../common/ConfirmationModal";
import { formatINR } from "../../../../utils/formatINR";
import { Button, EmptyState } from "../../../ui";
import { LoadFailed, PageHeader, RowsSkeleton, SearchBox, Segmented, fullName, shortDate, useAdminApi, useAdminLoad, useDebounced, withToast } from "./shared";

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
      status === "Published" ? "border-success/40 text-success" : "border-line text-muted"
    }`}
  >
    <span aria-hidden="true">{status === "Published" ? "●" : "○"}</span>
    {status === "Published" ? "Published" : "Draft"}
  </span>
);

export default function AdminCourses() {
  const api = useAdminApi();
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("all");
  const q = useDebounced(text);
  const params = { q: q.trim().length >= 2 ? q.trim() : undefined, status: filter === "all" ? undefined : filter };
  const [{ status, data }, load] = useAdminLoad("/courses", params, [q, filter]);
  const [confirm, setConfirm] = useState(null);

  const setStatus = async (course, next) => {
    setConfirm(null);
    const res = await withToast(api("PATCH", `/courses/${course._id}/status`, { status: next }), {
      loading: next === "Published" ? "Publishing…" : "Unpublishing…",
      fallbackError: "The course couldn't be updated.",
    });
    if (res) load();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Courses">Every course on StudyNotion, drafts included. Unpublishing hides a course from the catalog; enrolled students keep access.</PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={text} onChange={setText} placeholder="Search by course name" label="Search courses" />
        <Segmented label="Status" value={filter} onChange={setFilter} options={[["all", "All"], ["Published", "Published"], ["Draft", "Drafts"]]} />
      </div>

      <div aria-live="polite">
        {status === "failed" ? (
          <LoadFailed what="Courses" onRetry={load} />
        ) : !data ? (
          <RowsSkeleton label="Loading courses" />
        ) : data.length === 0 ? (
          <EmptyState title="No courses match">Try another search or filter.</EmptyState>
        ) : (
          <ul className={`flex flex-col gap-3 ${status === "loading" ? "opacity-60" : ""}`}>
            {data.map((c) => (
              <li key={c._id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                {c.thumbnail && <img src={c.thumbnail} alt="" className="hidden aspect-video w-28 rounded-lg object-cover sm:block" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/courses/${c._id}`} className="font-bold text-ink hover:underline">
                      {c.courseName}
                    </Link>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {c.instructor ? (
                      <Link to={`/dashboard/admin/users/${c.instructor._id}`} className="hover:text-ink hover:underline">
                        {fullName(c.instructor)}
                      </Link>
                    ) : (
                      "No instructor"
                    )}
                    {" · "}
                    {c.category?.name || "No subject"} · {formatINR(c.price) || "₹0"} · {c.studentsCount} {c.studentsCount === 1 ? "student" : "students"} · Created {shortDate(c.createdAt)}
                  </p>
                </div>
                {c.status === "Published" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setConfirm({
                        text1: `Unpublish ${c.courseName}?`,
                        text2: "It disappears from the catalog and search. Students already enrolled keep access, and you can publish it again any time.",
                        btn1Text: "Unpublish",
                        btn1Handler: () => setStatus(c, "Draft"),
                        btn2Text: "Cancel",
                        btn2Handler: () => setConfirm(null),
                      })
                    }
                  >
                    Unpublish
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setStatus(c, "Published")}>
                    Publish
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {confirm && <ConfirmationModal modalData={confirm} />}
    </div>
  );
}
