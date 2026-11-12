import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

import { apiConnector } from "../../../../services/apiconnector";
import { adminEndpoints } from "../../../../services/apis";
import { Button, EmptyState } from "../../../ui";

/** Calls an API (the admin API by default) with the current login. Throws with the server's message. */
export function useAdminApi(base = adminEndpoints.BASE) {
  const { token } = useSelector((state) => state.auth);
  return useCallback(
    async (method, path, body, params) => {
      const res = await apiConnector(method, `${base}${path}`, body ?? null, { Authorization: `Bearer ${token}` }, params ?? null);
      if (!res.data?.success) throw new Error(res.data?.message || "Something went wrong");
      return res.data;
    },
    [token, base]
  );
}

/** Loads a GET endpoint; re-runs when `deps` change. Returns [state, reload]. */
export function useAdminLoad(path, params, deps = [], base) {
  const api = useAdminApi(base);
  const [state, setState] = useState({ status: "loading", data: null, meta: null });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const { data, success, message, ...meta } = await api("GET", path, null, params);
      setState({ status: "ready", data, meta });
    } catch (error) {
      console.error(`Admin ${path}:`, error);
      setState({ status: "failed", data: null, meta: null, message: error.response?.data?.message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, path, ...deps]);
  useEffect(() => {
    load();
  }, [load]);
  return [state, load];
}

/** Runs a change with loading → success/error in one toast. Returns the response or null. */
export async function withToast(promise, { loading, fallbackError }) {
  const id = toast.loading(loading);
  try {
    const res = await promise;
    toast.success(res.message || "Saved", { id });
    return res;
  } catch (error) {
    toast.error(error.response?.data?.message || error.message || fallbackError, { id });
    return null;
  }
}

export const PageHeader = ({ title, children, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
      {children && <p className="mt-1 text-muted">{children}</p>}
    </div>
    {actions}
  </div>
);

export const LoadFailed = ({ what, onRetry, message }) => (
  <EmptyState title={`${what} couldn't load`} action={<Button variant="secondary" onClick={onRetry}>Try again</Button>}>
    {message || "The server may still be waking up. This usually takes under a minute."}
  </EmptyState>
);

export const RowsSkeleton = ({ rows = 5, label }) => (
  <div role="status" aria-label={label} className="flex flex-col gap-2">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="skeleton h-14 rounded-xl" />
    ))}
  </div>
);

export const SearchBox = ({ value, onChange, placeholder, label }) => (
  <label className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-field bg-surface px-3 text-muted focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 sm:max-w-sm">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
    <span className="sr-only">{label}</span>
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-ink placeholder:text-muted focus:outline-none" />
  </label>
);

/** Segmented filter: options = [[value, label], …] */
export const Segmented = ({ value, onChange, options, label }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-surface p-1">
    {options.map(([v, text]) => (
      <button
        key={v}
        type="button"
        role="radio"
        aria-checked={value === v}
        onClick={() => onChange(v)}
        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${value === v ? "bg-accent text-on-accent" : "text-muted hover:text-ink"}`}
      >
        {text}
      </button>
    ))}
  </div>
);

export const Pager = ({ page, pages, onPage }) =>
  pages > 1 ? (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm text-muted">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {pages}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </nav>
  ) : null;

export const fullName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "Unknown user";
export const shortDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/** Debounces a fast-changing value (search boxes). */
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
