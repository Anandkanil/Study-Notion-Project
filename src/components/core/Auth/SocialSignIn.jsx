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
  const latest = useRef({ accountType, redirectTo });
  latest.current = { accountType, redirectTo };

  useEffect(() => {
    let alive = true;
    loadProviders().then((p) => alive && setProviders(p));
    return () => {
      alive = false;
    };
  }, []);

  // Our own Google button (so it matches GitHub's and the theme) using Google's token popup.
  // The server checks the token with Google before signing anyone in.
  const [googleBusy, setGoogleBusy] = useState(false);
  const tokenClient = useRef(null);
  useEffect(() => {
    if (!providers?.google?.clientId) return;
    loadGoogle().catch(() => setGoogleFailed(true)); // load early so the popup opens on the first click
  }, [providers]);

  const startGoogle = async () => {
    try {
      await loadGoogle();
    } catch {
      setGoogleFailed(true);
      return;
    }
    tokenClient.current ||= window.google.accounts.oauth2.initTokenClient({
      client_id: providers.google.clientId,
      scope: "openid email profile",
      callback: async (resp) => {
        if (!resp?.access_token) {
          setGoogleBusy(false);
          return;
        }
        await dispatch(socialLogin("google", { accessToken: resp.access_token, accountType: latest.current.accountType }, navigate, latest.current.redirectTo));
        setGoogleBusy(false);
      },
      error_callback: () => setGoogleBusy(false), // popup closed or blocked
    });
    setGoogleBusy(true);
    tokenClient.current.requestAccessToken({ prompt: "select_account" });
  };

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
      {providers.google && !googleFailed && (
        <button
          type="button"
          onClick={startGoogle}
          aria-busy={googleBusy || undefined}
          className="flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-full border border-line bg-surface px-4 font-semibold text-ink transition-colors hover:bg-raised disabled:opacity-70"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          {googleBusy ? "Waiting for Google…" : mode === "signup" ? "Sign up with Google" : "Continue with Google"}
        </button>
      )}
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
