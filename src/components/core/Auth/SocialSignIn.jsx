import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { apiConnector } from "../../../services/apiconnector";
import { endpoints } from "../../../services/apis";
import { socialLogin } from "../../../services/operations/authAPI";

// Which providers are switched on comes from the server, once per page load
let providersPromise = null;
const loadProviders = () => {
  providersPromise ||= apiConnector("GET", endpoints.PROVIDERS_API)
    .then((r) => r.data?.data || {})
    .catch(() => {
      providersPromise = null;
      return {};
    });
  return providersPromise;
};

let googleScript = null;
const loadGoogle = () => {
  googleScript ||= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => {
      googleScript = null;
      reject(new Error("Google script failed"));
    };
    document.head.appendChild(s);
  });
  return googleScript;
};

export const GITHUB_STATE_KEY = "sn-github-state";

/**
 * "Continue with Google / GitHub" buttons. accountType applies only when this creates a
 * new account; existing accounts keep their role.
 */
export default function SocialSignIn({ accountType = "Student", redirectTo, mode = "login" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [providers, setProviders] = useState(null);
  const [googleFailed, setGoogleFailed] = useState(false);
  const googleRef = useRef(null);
  const latest = useRef({ accountType, redirectTo });
  latest.current = { accountType, redirectTo };

  useEffect(() => {
    let alive = true;
    loadProviders().then((p) => alive && setProviders(p));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const clientId = providers?.google?.clientId;
    if (!clientId || !googleRef.current) return;
    let alive = true;
    loadGoogle()
      .then(() => {
        if (!alive || !googleRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) =>
            dispatch(socialLogin("google", { credential, accountType: latest.current.accountType }, navigate, latest.current.redirectTo)),
          ux_mode: "popup",
          context: mode === "signup" ? "signup" : "signin",
        });
        const dark = document.documentElement.dataset.theme !== "light";
        window.google.accounts.id.renderButton(googleRef.current, {
          theme: dark ? "filled_black" : "outline",
          size: "large",
          shape: "pill",
          text: mode === "signup" ? "signup_with" : "continue_with",
          width: Math.min(googleRef.current.offsetWidth || 360, 400),
        });
      })
      .catch(() => alive && setGoogleFailed(true));
    return () => {
      alive = false;
    };
  }, [providers, dispatch, navigate, mode]);

  const startGitHub = () => {
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    sessionStorage.setItem(GITHUB_STATE_KEY, JSON.stringify({ state, accountType: latest.current.accountType, redirectTo: latest.current.redirectTo, redirectUri }));
    const params = new URLSearchParams({ client_id: providers.github.clientId, redirect_uri: redirectUri, scope: "read:user user:email", state, allow_signup: "true" });
    window.location.assign(`https://github.com/login/oauth/authorize?${params}`);
  };

  if (!providers || (!providers.google && !providers.github)) return null;

  return (
    <div className="flex flex-col gap-3">
      {providers.google && !googleFailed && <div ref={googleRef} className="flex min-h-[44px] w-full justify-center" />}
      {providers.github && (
        <button
          type="button"
          onClick={startGitHub}
          className="flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-full border border-line bg-surface px-4 font-semibold text-ink transition-colors hover:bg-raised"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
          </svg>
          {mode === "signup" ? "Sign up with GitHub" : "Continue with GitHub"}
        </button>
      )}
      <div className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        or use your email
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
