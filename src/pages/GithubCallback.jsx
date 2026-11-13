import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { socialLogin } from "../services/operations/authAPI";
import { GITHUB_STATE_KEY } from "../components/core/Auth/SocialSignIn";

/** GitHub sends people back here with ?code&state; we check state and finish signing in. */
export default function GithubCallback() {
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(GITHUB_STATE_KEY) || "null");
    } catch {
      saved = null;
    }
    sessionStorage.removeItem(GITHUB_STATE_KEY);
    const code = params.get("code");
    if (params.get("error")) return setError("GitHub sign-in was cancelled.");
    if (!code || !saved || saved.state !== params.get("state")) return setError("This sign-in link has expired. Please try again.");
    dispatch(socialLogin("github", { code, redirectUri: saved.redirectUri, accountType: saved.accountType }, navigate, saved.redirectTo)).then((ok) => {
      if (!ok) setError("GitHub sign-in didn't work. Please try again.");
    });
  }, [params, dispatch, navigate]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      {error ? (
        <>
          <h1 className="text-2xl font-bold text-ink">{error}</h1>
          <Link to="/login" className="btn-grad inline-flex min-h-[46px] items-center rounded-xl px-5 font-semibold">
            Back to log in
          </Link>
        </>
      ) : (
        <>
          <span className="skeleton h-12 w-12 rounded-full" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-ink" role="status">
            Signing you in with GitHub…
          </h1>
        </>
      )}
    </main>
  );
}
