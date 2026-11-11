import React, { forwardRef, useId, useState } from "react";

/* ===== Night Shift UI primitives ===== */

export const Spinner = ({ className = "" }) => (
  <span
    aria-hidden="true"
    className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
  />
);

const VARIANTS = {
  primary: "bg-accent text-on-accent hover:brightness-105",
  secondary: "border border-richblack-600 bg-surface text-ink hover:bg-raised",
  ghost: "text-ink hover:bg-raised",
  danger: "border border-danger bg-surface text-danger hover:bg-danger/10",
};
const SIZES = { md: "px-5 py-3 text-base", sm: "px-3.5 py-2 text-sm", lg: "px-6 py-3.5 text-base" };

export const buttonClass = (variant = "primary", size = "md", extra = "") =>
  `inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;

/** Button. `loading` disables it and shows a spinner plus `loadingText`. */
export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", loading = false, loadingText, className = "", children, type = "button", disabled, ...rest },
  ref
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonClass(variant, size, className)} {...rest}>
      {loading && <Spinner />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
});

const inputBase =
  "w-full rounded-xl border bg-surface px-4 py-3 text-base text-ink placeholder:text-richblack-400 transition-colors focus:outline-none focus-visible:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

/**
 * Labelled input with optional hint and error. Extra props go to the <input>.
 * Use `as="textarea"` or `as="select"` for those elements.
 */
export const Field = forwardRef(function Field(
  { label, hint, error, required, as = "input", className = "", inputClassName = "", children, id: idProp, ...rest },
  ref
) {
  const auto = useId();
  const id = idProp || `f${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const Tag = as;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      <Tag
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        className={`${inputBase} ${error ? "border-danger" : "border-line"} ${as === "textarea" ? "min-h-[120px] resize-y" : ""} ${inputClassName}`}
        {...rest}
      >
        {children}
      </Tag>
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

/** Password field with an accessible show/hide button. */
export const PasswordField = forwardRef(function PasswordField(props, ref) {
  const [show, setShow] = useState(false);
  const { label, error, hint, required, className, ...rest } = props;
  const auto = useId();
  const id = rest.id || `p${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className || ""}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={show ? "text" : "password"}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
          className={`${inputBase} pr-14 ${error ? "border-danger" : "border-line"}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {show && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
});

/** Empty state: what's missing and what to do next. */
export const EmptyState = ({ title, children, action }) => (
  <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-richblack-600 bg-surface p-8">
    <h2 className="font-display text-xl font-medium text-ink">{title}</h2>
    {children && <div className="max-w-prose text-muted">{children}</div>}
    {action}
  </div>
);

/** Section card used across the dashboard. */
export const Card = ({ as: Tag = "section", className = "", children, ...rest }) => (
  <Tag className={`rounded-2xl border border-line bg-surface p-6 ${className}`} {...rest}>
    {children}
  </Tag>
);
