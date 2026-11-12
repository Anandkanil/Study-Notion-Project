import React, { useState } from "react";
import { useSelector } from "react-redux";

import { apiConnector } from "../../services/apiconnector";
import { studentEndpoints } from "../../services/apis";
import { formatINR } from "../../utils/formatINR";
import { Button } from "../ui";

/**
 * "Have a discount code?" for checkout. Checks the code against `courseIds` on the server
 * and reports the result through onApply({ code, saving, courseId, … }) / onApply(null).
 */
export default function DiscountCode({ courseIds, applied, onApply }) {
  const { token } = useSelector((s) => s.auth);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-sm">
        <span className="text-ink">
          <span className="font-mono font-bold">{applied.code}</span> applied: {applied.percentOff}% off {applied.courseName}, you save {formatINR(applied.saving)}
        </span>
        <button type="button" onClick={() => onApply(null)} className="shrink-0 font-semibold text-muted hover:text-ink hover:underline">
          Remove
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-sm font-semibold text-accent-text underline-offset-4 hover:underline">
        Have a discount code?
      </button>
    );
  }

  const check = async (e) => {
    e.preventDefault();
    if (!token) return setError("Log in to use a discount code.");
    setChecking(true);
    setError("");
    try {
      const res = await apiConnector("POST", studentEndpoints.COUPON_API, { code, courses: courseIds }, { Authorization: `Bearer ${token}` });
      onApply(res.data.data);
      setCode("");
      setOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't check the code. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <form onSubmit={check} noValidate className="flex flex-col gap-1.5">
      <label htmlFor="discount-code" className="text-sm font-semibold text-ink">
        Discount code
      </label>
      <div className="flex gap-2">
        <input
          id="discount-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
          maxLength={20}
          autoComplete="off"
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? "discount-code-err" : undefined}
          className="h-11 min-w-0 flex-1 rounded-xl border border-field bg-bg px-3 font-mono text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          placeholder="LAUNCH20"
        />
        <Button type="submit" variant="secondary" loading={checking} loadingText="Checking…" disabled={code.length < 3}>
          Apply
        </Button>
      </div>
      {error && (
        <p id="discount-code-err" role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
