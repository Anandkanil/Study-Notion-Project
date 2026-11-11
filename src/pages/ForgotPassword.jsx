import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { getPasswordResetToken } from "../services/operations/authAPI";
import { Button, Field } from "../components/ui";

const ForgotPassword = () => {
  const { loading } = useSelector((state) => state.auth);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState("");
  const dispatch = useDispatch();

  const onSubmit = (e) => {
    e.preventDefault();
    dispatch(getPasswordResetToken(email.trim(), setEmailSent));
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-14">
      <h1 className="font-display text-3xl font-bold text-ink">{emailSent ? "Check your email" : "Reset your password"}</h1>
      <p className="mt-3 text-lg text-muted" role={emailSent ? "status" : undefined}>
        {emailSent ? (
          <>
            If an account exists for <strong className="font-semibold text-ink">{email}</strong>, we've sent a link to reset the password. The link works once and expires in 15 minutes.
          </>
        ) : (
          "Enter the email you signed up with and we'll send you a link to choose a new password."
        )}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        {!emailSent && (
          <Field
            label="Email address"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        )}
        <Button type="submit" size="lg" variant={emailSent ? "secondary" : "primary"} loading={loading} loadingText="Sending…">
          {emailSent ? "Send the link again" : "Send reset link"}
        </Button>
      </form>

      <Link to="/login" className="mt-6 font-semibold text-muted hover:text-ink">
        Back to log in
      </Link>
    </div>
  );
};

export default ForgotPassword;
