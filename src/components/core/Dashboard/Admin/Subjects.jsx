import React, { useState } from "react";

import ConfirmationModal from "../../../common/ConfirmationModal";
import { Button, EmptyState, Field } from "../../../ui";
import { LoadFailed, PageHeader, RowsSkeleton, useAdminApi, useAdminLoad, withToast } from "./shared";

function SubjectForm({ initial = { name: "", description: "" }, submitText, busyText, onSubmit, onCancel }) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const nameError = tried && name.trim().length < 2 ? "Give the subject a name of at least 2 characters." : undefined;
  const descError = tried && description.trim().length < 10 ? "Add a short description (at least 10 characters)." : undefined;

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setTried(true);
        if (name.trim().length < 2 || description.trim().length < 10) return;
        setBusy(true);
        const ok = await onSubmit({ name: name.trim(), description: description.trim() });
        setBusy(false);
        if (ok && !onCancel) {
          setName("");
          setDescription("");
          setTried(false);
        }
      }}
      className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-start"
    >
      <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} error={nameError} placeholder="e.g. Data Science" />
      <Field label="Description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} error={descError} placeholder="What learners will find in this subject" />
      <div className="flex gap-2 sm:mt-7">
        <Button type="submit" loading={busy} loadingText={busyText}>
          {submitText}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export default function AdminSubjects() {
  const api = useAdminApi();
  const [{ status, data }, load] = useAdminLoad("/categories");
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const create = async (body) => {
    const res = await withToast(api("POST", "/categories", body), { loading: "Adding subject…", fallbackError: "The subject couldn't be added." });
    if (res) load();
    return !!res;
  };
  const save = async (id, body) => {
    const res = await withToast(api("PUT", `/categories/${id}`, body), { loading: "Saving…", fallbackError: "The subject couldn't be saved." });
    if (res) {
      setEditing(null);
      load();
    }
    return !!res;
  };
  const remove = async (id) => {
    setConfirm(null);
    const res = await withToast(api("DELETE", `/categories/${id}`), { loading: "Deleting subject…", fallbackError: "The subject couldn't be deleted." });
    if (res) load();
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Subjects">The groups courses are listed under in the catalog. Instructors pick one for each course.</PageHeader>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-display text-lg font-medium text-ink">Add a subject</h2>
        <SubjectForm submitText="Add subject" busyText="Adding…" onSubmit={create} />
      </section>

      {status === "failed" ? (
        <LoadFailed what="Subjects" onRetry={load} />
      ) : !data ? (
        <RowsSkeleton label="Loading subjects" />
      ) : data.length === 0 ? (
        <EmptyState title="No subjects yet">Add the first one above. Courses need a subject before they can be published.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((c) => (
            <li key={c._id} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              {editing === c._id ? (
                <SubjectForm initial={c} submitText="Save" busyText="Saving…" onSubmit={(body) => save(c._id, body)} onCancel={() => setEditing(null)} />
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{c.name}</p>
                    <p className="mt-0.5 text-sm text-muted">{c.description}</p>
                  </div>
                  <span className="text-sm text-muted">
                    {c.courseCount} {c.courseCount === 1 ? "course" : "courses"}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(c._id)}>
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setConfirm(
                          c.courseCount > 0
                            ? {
                                text1: `${c.name} still has courses`,
                                text2: `Move its ${c.courseCount} ${c.courseCount === 1 ? "course" : "courses"} to another subject before deleting it.`,
                                btn1Text: "OK",
                                btn1Handler: () => setConfirm(null),
                                btn2Text: "Close",
                                btn2Handler: () => setConfirm(null),
                              }
                            : {
                                text1: `Delete ${c.name}?`,
                                text2: "It has no courses. This can't be undone.",
                                btn1Text: "Delete subject",
                                btn1Handler: () => remove(c._id),
                                btn2Text: "Cancel",
                                btn2Handler: () => setConfirm(null),
                                danger: true,
                              }
                        )
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {confirm && <ConfirmationModal modalData={confirm} />}
    </div>
  );
}
