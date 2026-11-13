import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { changePassword, deleteProfile, updateDisplayPicture, updateProfile } from "../../../../services/operations/SettingsAPI";
import { logout } from "../../../../services/operations/authAPI";
import { apiConnector } from "../../../../services/apiconnector";
import { profileEndpoints } from "../../../../services/apis";
import { setUser } from "../../../../slices/profileSlice";
import { toast } from "react-hot-toast";
import ConfirmationModal from "../../../common/ConfirmationModal";
import { Button, Field, PasswordField } from "../../../ui";

const GENDERS = ["Male", "Female", "Non-Binary", "Prefer not to say", "Other"];
const MAX_IMAGE_MB = 2;

const Section = ({ id, title, description, children, tone }) => (
  <section aria-labelledby={id} className={`grid gap-6 rounded-2xl border bg-surface p-6 md:grid-cols-[220px_1fr] ${tone === "danger" ? "border-danger/50" : "border-line"}`}>
    <div>
      <h2 id={id} className={`font-semibold ${tone === "danger" ? "text-danger" : "text-ink"}`}>
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
    <div className="min-w-0">{children}</div>
  </section>
);

function PhotoSection() {
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    setError("");
    if (!f) return;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(f.type)) return setError("Choose a PNG, JPG, GIF or WebP image.");
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) return setError(`Choose an image under ${MAX_IMAGE_MB} MB.`);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!file) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("displayPicture", file);
    await dispatch(updateDisplayPicture(token, fd));
    setSaving(false);
    setFile(null);
    setPreview(null);
  };

  return (
    <Section id="st-photo" title="Profile photo" description="Shown on your profile and, for instructors, on course pages.">
      <div className="flex flex-wrap items-center gap-5">
        <img src={preview || user?.image} alt="" className="h-20 w-20 rounded-2xl object-cover" />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-3">
            <input ref={inputRef} id="photo-input" type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={pick} aria-describedby="photo-help" />
            <label htmlFor="photo-input" className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-richblack-600 bg-surface px-5 py-3 font-bold text-ink hover:bg-raised has-[:focus-visible]:outline">
              Choose image
            </label>
            {file && (
              <Button onClick={save} loading={saving} loadingText="Uploading…">
                Save photo
              </Button>
            )}
          </div>
          <p id="photo-help" className={`text-sm ${error ? "font-medium text-danger" : "text-muted"}`}>
            {error || (file ? `Selected: ${file.name}` : `PNG, JPG, GIF or WebP, up to ${MAX_IMAGE_MB} MB.`)}
          </p>
        </div>
      </div>
    </Section>
  );
}

function ProfileSection() {
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const d = user?.additionalDetails || {};
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      dateOfBirth: d.dateOfBirth ? String(d.dateOfBirth).split("T")[0] : "",
      gender: d.gender || "",
      contactNumber: d.contactNumber || "",
      about: d.about || "",
    },
  });

  const onSubmit = async (data) => {
    await dispatch(updateProfile(token, data));
    reset(data);
  };

  return (
    <Section id="st-profile" title="Personal details" description="Your name is shown on reviews and, for instructors, on courses.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" required autoComplete="given-name" error={errors.firstName?.message} {...register("firstName", { required: "Enter your first name." })} />
          <Field label="Last name" required autoComplete="family-name" error={errors.lastName?.message} {...register("lastName", { required: "Enter your last name." })} />
          <Field
            label="Date of birth"
            type="date"
            max={new Date().toISOString().split("T")[0]}
            error={errors.dateOfBirth?.message}
            {...register("dateOfBirth", { validate: (v) => !v || new Date(v) < new Date() || "Date of birth can't be in the future." })}
          />
          <Field label="Gender" as="select" {...register("gender")}>
            <option value="">Select…</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Field>
          <Field
            label="Phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            hint="Optional. 10 to 13 digits."
            error={errors.contactNumber?.message}
            {...register("contactNumber", { pattern: { value: /^\+?[0-9]{10,13}$/, message: "Enter 10 to 13 digits, optionally starting with +." } })}
          />
        </div>
        <Field label="About you" as="textarea" rows={4} hint="A sentence or two. Instructors: this appears on your course pages." {...register("about", { maxLength: { value: 600, message: "Keep it under 600 characters." } })} error={errors.about?.message} />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={isSubmitting} loadingText="Saving…" disabled={!isDirty}>
            Save changes
          </Button>
          {isDirty && (
            <Button variant="ghost" onClick={() => reset()}>
              Discard
            </Button>
          )}
        </div>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const { token } = useSelector((state) => state.auth);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { oldPassword: "", newPassword: "", confirmNewPassword: "" } });

  const onSubmit = async ({ oldPassword, newPassword }) => {
    const ok = await changePassword(token, { oldPassword, newPassword });
    if (ok) reset();
  };

  return (
    <Section id="st-password" title="Password" description="Use at least 8 characters. You'll stay logged in on this device.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <PasswordField label="Current password" autoComplete="current-password" required error={errors.oldPassword?.message} {...register("oldPassword", { required: "Enter your current password." })} />
        <div className="grid gap-5 sm:grid-cols-2">
          <PasswordField
            label="New password"
            autoComplete="new-password"
            required
            error={errors.newPassword?.message}
            {...register("newPassword", { required: "Enter a new password.", minLength: { value: 8, message: "Use at least 8 characters." } })}
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            required
            error={errors.confirmNewPassword?.message}
            {...register("confirmNewPassword", { validate: (v) => v === watch("newPassword") || "Passwords don't match." })}
          />
        </div>
        <Button type="submit" className="self-start" loading={isSubmitting} loadingText="Updating…">
          Update password
        </Button>
      </form>
    </Section>
  );
}

function DeleteSection() {
  const { token } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.profile);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null);

  const ask = () =>
    setConfirm({
      danger: true,
      text1: "Delete your account permanently?",
      text2:
        user?.accountType === "Instructor"
          ? "Your profile will be removed. Delete your courses first — accounts with courses can't be deleted. This can't be undone."
          : "Your profile, course access, progress and reviews will be removed. Courses you paid for won't be refunded. This can't be undone.",
      btn1Text: "Delete account",
      btn2Text: "Keep my account",
      btn1Handler: async () => {
        setConfirm(null);
        const deleted = await dispatch(deleteProfile(token, navigate));
        if (deleted) dispatch(logout(navigate));
      },
      btn2Handler: () => setConfirm(null),
    });

  return (
    <Section id="st-delete" tone="danger" title="Delete account" description="Permanently remove your account and its data.">
      <p className="text-muted">Deleting your account can't be undone, and you'll lose access to any courses you've bought.</p>
      <Button variant="danger" className="mt-4" onClick={ask}>
        Delete my account
      </Button>
      {confirm && <ConfirmationModal modalData={confirm} />}
    </Section>
  );
}

function EmailSection() {
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [saving, setSaving] = useState(false);
  const on = user?.emailPrefs?.weeklyDigest !== false;

  const toggle = async () => {
    setSaving(true);
    try {
      const res = await apiConnector("PUT", profileEndpoints.EMAIL_PREFS_API, { weeklyDigest: !on }, { Authorization: `Bearer ${token}` });
      const updated = { ...user, emailPrefs: { ...(user.emailPrefs || {}), weeklyDigest: !on } };
      dispatch(setUser(updated));
      localStorage.setItem("user", JSON.stringify(updated));
      toast.success(res.data?.message || "Saved");
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section id="st-email" title="Emails" description="Receipts, sign-in codes and course updates always arrive. This is the only optional email.">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-ink">Weekly learning reminder</p>
          <p className="text-sm text-muted">On Sundays: your lessons that week, your streak and where to pick up. Only sent if you learned in the last four weeks.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Weekly learning reminder"
          disabled={saving}
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? "bg-accent" : "bg-line"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${on ? "left-6" : "left-1"}`} />
        </button>
      </div>
    </Section>
  );
}

export default function Settings() {
  const { user } = useSelector((state) => state.profile);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold text-ink">Settings</h1>
      <PhotoSection />
      <ProfileSection />
      <PasswordSection />
      {user?.accountType === "Student" && <EmailSection />}
      <DeleteSection />
    </div>
  );
}
