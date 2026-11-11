import React from "react";
import { Link } from "react-router-dom";
import { buttonClass } from "../components/ui";

const PageNotFound = () => (
  <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-5 px-6 py-20">
    <p className="font-display text-6xl font-bold text-accent-text">404</p>
    <h1 className="font-display text-3xl font-bold text-ink">This page doesn't exist</h1>
    <p className="text-lg text-muted">The link may be broken or the page may have moved. Head back home to find courses, or check the address for typos.</p>
    <div className="flex flex-wrap gap-3">
      <Link to="/" className={buttonClass("primary", "lg")}>
        Go to home
      </Link>
      <Link to="/contact" className={buttonClass("secondary", "lg")}>
        Report a broken link
      </Link>
    </div>
  </div>
);

export default PageNotFound;
