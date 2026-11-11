import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../services/operations/authAPI";
import { Button, PasswordField } from "../components/ui";

const UpdatePassword = () => {
  const { token } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [submitted, setSubmitted] = useState(false);
  const onChange = (e) => setFormData((d) => ({ ...d, [e.target.name]: e.target.value }));

  const tooShort = formData.password.length < 8;
  const mismatch = formData.confirmPassword !== formData.password;

  const onSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (tooShort || mismatch) return;
    dispatch(resetPassword(formData.password, formData.confirmPassword, decodeURIComponent(token), navigate));
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-14">
      <h1 className="font-display text-3xl font-bold text-ink">Choose a new password</h1>
      <p className="mt-3 text-lg text-muted">You'll use it the next time you log in.</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <PasswordField
          label="New password"
          name="password"
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={onChange}
          hint="At least 8 characters."
          error={submitted && tooShort ? "Use at least 8 characters." : undefined}
        />
        <PasswordField
          label="Confirm new password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={formData.confirmPassword}
          onChange={onChange}
          error={submitted && mismatch ? "Passwords don't match." : undefined}
        />
        <Button type="submit" size="lg" loading={loading} loadingText="Saving…">
          Save new password
        </Button>
      </form>

      <Link to="/login" className="mt-6 font-semibold text-muted hover:text-ink">
        Back to log in
      </Link>
    </div>
  );
};

export default UpdatePassword;
