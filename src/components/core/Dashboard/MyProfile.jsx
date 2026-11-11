import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { formattedDate } from "../../../utils/dateFormatter";
import { buttonClass } from "../../ui";

const Detail = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <dt className="text-sm text-muted">{label}</dt>
    <dd className={value ? "font-semibold text-ink" : "text-muted"}>{value || "Not added"}</dd>
  </div>
);

export default function MyProfile() {
  const { user } = useSelector((state) => state.profile);
  const d = user?.additionalDetails || {};
  const missing = [!d.about && "a short bio", !d.contactNumber && "a phone number", !d.dateOfBirth && "your birthday"].filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-ink">Profile</h1>
        <Link to="/dashboard/settings" className={buttonClass("secondary")}>
          Edit profile
        </Link>
      </div>

      <section className="flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-surface p-6">
        <img src={user?.image} alt="" className="h-20 w-20 rounded-2xl object-cover" />
        <div className="min-w-0">
          <p className="text-xl font-bold text-ink">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="truncate text-muted">{user?.email}</p>
          <p className="mt-2 inline-block rounded-md bg-raised px-2 py-0.5 text-sm font-semibold text-ink">{user?.accountType}</p>
        </div>
      </section>

      {missing.length > 0 && (
        <p className="rounded-2xl border border-dashed border-richblack-600 bg-surface px-5 py-4 text-muted">
          Your profile is missing {missing.join(", ")}.{" "}
          <Link to="/dashboard/settings" className="font-semibold text-accent-text hover:underline">
            Add them in settings
          </Link>
          {user?.accountType === "Instructor" ? " — learners see your bio on your course pages." : "."}
        </p>
      )}

      <section aria-labelledby="pf-about" className="rounded-2xl border border-line bg-surface p-6">
        <h2 id="pf-about" className="font-semibold text-ink">
          About
        </h2>
        <p className={`mt-2 ${d.about ? "text-ink" : "text-muted"}`}>{d.about || "No bio yet."}</p>
      </section>

      <section aria-labelledby="pf-details" className="rounded-2xl border border-line bg-surface p-6">
        <h2 id="pf-details" className="font-semibold text-ink">
          Personal details
        </h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <Detail label="First name" value={user?.firstName} />
          <Detail label="Last name" value={user?.lastName} />
          <Detail label="Email" value={user?.email} />
          <Detail label="Phone" value={d.contactNumber} />
          <Detail label="Gender" value={d.gender} />
          <Detail label="Date of birth" value={formattedDate(d.dateOfBirth)} />
        </dl>
      </section>
    </div>
  );
}
