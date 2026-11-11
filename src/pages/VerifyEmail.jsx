import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { sendOtp, signUp } from "../services/operations/authAPI";
import { Button, Field } from "../components/ui";

const RESEND_AFTER = 30;

const VerifyEmail = () => {
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_AFTER);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { signupData, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Opened directly, or after a refresh: there is nothing to verify yet
  if (!signupData) return <Navigate to="/signup" replace />;

  const { firstName, lastName, email, password, confirmPassword, accountType } = signupData;

  const onSubmit = (e) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    dispatch(signUp(firstName, lastName, email, password, confirmPassword, accountType, otp, navigate));
  };

  const resend = () => {
    setCooldown(RESEND_AFTER);
    dispatch(sendOtp(email, navigate));
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-14">
      <h1 className="font-display text-3xl font-bold text-ink">Check your email</h1>
      <p className="mt-3 text-lg text-muted">
        We sent a 6-digit code to <strong className="font-semibold text-ink">{email}</strong>. It expires in 5 minutes.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <Field
          label="Verification code"
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputClassName="text-center font-display text-2xl tracking-[0.5em]"
          placeholder="••••••"
        />
        <Button type="submit" size="lg" loading={loading} loadingText="Verifying…" disabled={otp.length !== 6}>
          Verify and create account
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/signup" className="font-semibold text-muted hover:text-ink">
          Use a different email
        </Link>
        <button
          type="button"
          onClick={resend}
          disabled={loading || cooldown > 0}
          className="font-semibold text-accent-text hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;
