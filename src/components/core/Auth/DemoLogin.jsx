import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { demoLogin } from "../../../services/operations/authAPI";

const ROLES = [
  { role: "student", label: "Student", hint: "Courses in progress, streak and certificates" },
  { role: "instructor", label: "Instructor", hint: "Courses, students and earnings" },
  { role: "admin", label: "Admin", hint: "Sales, users and course reviews" },
];

/** "Explore without an account": opens a shared, read-only demo account. */
export default function DemoLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);

  return (
    <section aria-labelledby="demo-title" className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div>
        <h2 id="demo-title" className="font-semibold text-ink">Explore without an account</h2>
        <p className="text-sm text-muted">Open a read-only demo. Nothing you do there is saved.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {ROLES.map((r) => (
          <button
            key={r.role}
            type="button"
            disabled={loading}
            onClick={() => dispatch(demoLogin(r.role, navigate))}
            className="flex flex-col items-start gap-0.5 rounded-xl border border-line bg-raised px-3 py-2.5 text-left transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
          >
            <span className="text-sm font-semibold text-ink">Try as {r.label.toLowerCase()}</span>
            <span className="text-xs leading-snug text-muted">{r.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
