import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Logo from "./Logo";

const Column = ({ title, links }) => (
  <div className="flex flex-col gap-3">
    <h2 className="text-sm font-semibold text-ink">{title}</h2>
    <ul className="flex flex-col gap-2">
      {links.map(([label, to]) => (
        <li key={label}>
          <Link to={to} className="text-muted transition-colors hover:text-ink">
            {label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);

export default function Footer() {
  const { token } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.profile);

  const account = token
    ? [
        [user?.accountType === "Instructor" ? "Instructor dashboard" : "Dashboard", "/dashboard"],
        ["Settings", "/dashboard/settings"],
      ]
    : [
        ["Log in", "/login"],
        ["Create an account", "/signup"],
        ["Forgot password", "/forgot-password"],
      ];

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-10 px-6 py-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
          <Logo />
          <p className="max-w-xs text-muted">
            Video courses in web development, cloud, machine learning, UI/UX and security. Learn at your own pace and pick up exactly where you stopped.
          </p>
        </div>
        <Column title="StudyNotion" links={[["About", "/about"], ["Contact", "/contact"]]} />
        <Column title="Your account" links={account} />
        <Column title="Teach" links={[["Become an instructor", "/signup"]]} />
      </div>
      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-6xl px-6 py-5 text-sm text-muted">© {new Date().getFullYear()} StudyNotion</p>
      </div>
    </footer>
  );
}
