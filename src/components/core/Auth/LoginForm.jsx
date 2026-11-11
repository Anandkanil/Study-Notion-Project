import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../../services/operations/authAPI";
import { Button, Field, PasswordField } from "../../ui";

export default function LoginForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading } = useSelector((state) => state.auth);

  // Only same-site paths, so a crafted link can't redirect elsewhere
  const from = location.state?.from;
  const redirectTo = typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : undefined;

  const [formData, setFormData] = useState({ email: "", password: "" });
  const onChange = (e) => setFormData((d) => ({ ...d, [e.target.name]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    if (formData.email.trim() && formData.password) {
      dispatch(login(formData.email.trim(), formData.password, navigate, redirectTo));
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate={false}>
      {redirectTo && (
        <p role="status" className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          Log in to continue to that page.
        </p>
      )}
      <Field
        label="Email address"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={formData.email}
        onChange={onChange}
        placeholder="you@example.com"
      />
      <div className="flex flex-col gap-2">
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={onChange}
        />
        <Link to="/forgot-password" className="self-end text-sm font-semibold text-accent-text hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" loading={loading} loadingText="Logging in…" size="lg">
        Log in
      </Button>
      <p className="text-center text-muted">
        New to StudyNotion?{" "}
        <Link to="/signup" className="font-semibold text-accent-text hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
