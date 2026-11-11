import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { sendOtp } from "../../../services/operations/authAPI";
import { setSignupData } from "../../../slices/authSlice";
import { ACCOUNT_TYPE } from "../../../utils/constants";
import { Button, Field, PasswordField } from "../../ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = ({ firstName, lastName, email, password, confirmPassword }) => {
  const e = {};
  if (!firstName.trim()) e.firstName = "Enter your first name.";
  if (!lastName.trim()) e.lastName = "Enter your last name.";
  if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address, like name@example.com.";
  if (password.length < 8) e.password = "Use at least 8 characters.";
  if (confirmPassword !== password) e.confirmPassword = "Passwords don't match.";
  return e;
};

export default function SignupForm() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const [params] = useSearchParams();

  const [accountType, setAccountType] = useState(
    params.get("role") === "instructor" ? ACCOUNT_TYPE.INSTRUCTOR : ACCOUNT_TYPE.STUDENT
  );
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validate(formData), [formData]);
  const show = (name) => (submitted || touched[name]) && errors[name];

  const onChange = (e) => setFormData((d) => ({ ...d, [e.target.name]: e.target.value }));
  const onBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  const onSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) {
      const first = document.querySelector('[aria-invalid="true"]');
      first?.focus();
      return;
    }
    const data = { ...formData, email: formData.email.trim(), accountType };
    dispatch(setSignupData(data));
    dispatch(sendOtp(data.email, navigate));
  };

  const roles = [
    [ACCOUNT_TYPE.STUDENT, "I want to learn"],
    [ACCOUNT_TYPE.INSTRUCTOR, "I want to teach"],
  ];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold text-ink">Account type</legend>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1">
          {roles.map(([type, label]) => (
            <label
              key={type}
              className={`cursor-pointer rounded-lg px-3 py-2.5 text-center font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                accountType === type ? "bg-accent text-on-accent" : "text-muted hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name="accountType"
                value={type}
                checked={accountType === type}
                onChange={() => setAccountType(type)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" name="firstName" autoComplete="given-name" required value={formData.firstName} onChange={onChange} onBlur={onBlur} error={show("firstName")} />
        <Field label="Last name" name="lastName" autoComplete="family-name" required value={formData.lastName} onChange={onChange} onBlur={onBlur} error={show("lastName")} />
      </div>
      <Field
        label="Email address"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={formData.email}
        onChange={onChange}
        onBlur={onBlur}
        error={show("email")}
        hint="We'll send a 6-digit code to confirm it."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <PasswordField label="Password" name="password" autoComplete="new-password" required value={formData.password} onChange={onChange} onBlur={onBlur} error={show("password")} hint="At least 8 characters." />
        <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" required value={formData.confirmPassword} onChange={onChange} onBlur={onBlur} error={show("confirmPassword")} />
      </div>

      <Button type="submit" size="lg" loading={loading} loadingText="Sending code…">
        Create account
      </Button>
      <p className="text-center text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-accent-text hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
