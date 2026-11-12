import React, { useState } from "react";
import { Link } from "react-router-dom";

import ConfirmationModal from "../../../common/ConfirmationModal";
import { formatINR } from "../../../../utils/formatINR";
import { Button, EmptyState } from "../../../ui";
import { LoadFailed, PageHeader, ReasonDialog, RowsSkeleton, SearchBox, Segmented, fullName, shortDate, useAdminApi, useAdminLoad, useDebounced, withToast } from "./shared";

const BADGE = {
  Published: ["border-success/40 text-success", "●", "Published"],
  Pending: ["border-accent/60 text-accent-text", "◐", "Waiting for review"],
  Draft: ["border-line text-muted", "○", "Draft"],
};
const StatusBadge = ({ status }) => {
  const [cls, dot, text] = BADGE[status] || BADGE.Draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <span aria-hidden="true">{dot}</span>
      {text}
    </span>
  );
};

export default function AdminCourses() {
  const api = useAdminApi();
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("Pending");
  const [sendBack, setSendBack] = useState(null);
  const q = useDebounced(text);
  const params = { q: q.trim().length >= 2 ? q.trim() : undefined, status: filter === "all" ? undefined : filter };
  const [{ status, data }, load] = useAdminLoad("/courses", params, [q, filter]);
  const [confirm, setConfirm] = useState(null);

  const setStatus = async (course, next, note) => {
    setConfirm(null);
    const res = await withToast(api("PATCH", `/courses/${course._id}/status`, { status: next, note }), {
      loading: course.status === "Pending" ? (next === "Published" ? "Approving…" : "Sending back…") : next === "Published" ? "Publishing…" : "Unpublishing…",
      fallbackError: "The course couldn't be updated.",
    });
    if (res) {
      setSendBack(null);
      load();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Courses">Courses instructors publish wait here for your review before they appear in the catalog. Unpublishing hides a course; enrolled students keep access.</PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox value={text} onChange={setText} placeholder="Search by course name" label="Search courses" />
        <Segmented label="Status" value={filter} onChange={setFilter} options={[["Pending", "Waiting for review"], ["all", "All"], ["Published", "Published"], ["Draft", "Drafts"]]} />
      </div>

      <div aria-live="polite">
        {status === "failed" ? (
          <LoadFailed what="Courses" onRetry={load} />
        ) : !data ? (
          <RowsSkeleton label="Loading courses" />
        ) : data.length === 0 ? (
          <EmptyState title={filter === "Pending" ? "Nothing to review" : "No courses match"}>{filter === "Pending" ? "When an instructor publishes a course, it waits here for you." : "Try another search or filter."}</EmptyState>
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
                {c.status === "Draft" && c.reviewNote && <p className="w-full text-sm text-muted">Sent back: {c.reviewNote}</p>}
                {c.status === "Pending" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setStatus(c, "Published")}>
                      Approve
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setSendBack(c)}>
                      Send back
                    </Button>
                  </div>
                ) : c.status === "Published" ? (
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
      {sendBack && (
        <ReasonDialog
          title={`Send back ${sendBack.courseName}?`}
          description="It goes back to the instructor as a draft. They get an email with your note, fix it, and publish again."
          label="What should the instructor change?"
          placeholder="e.g. Lesson 3 has no audio. Please re-upload it."
          confirmText="Send back"
          onCancel={() => setSendBack(null)}
          onConfirm={(note) => setStatus(sendBack, "Draft", note)}
        />
      )}
    </div>
  );
}
