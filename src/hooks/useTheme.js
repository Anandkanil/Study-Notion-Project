import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sn-theme";

const readSaved = () => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
};

const systemTheme = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";

/** Current theme ("dark" | "light") and a toggle. The choice is remembered on this device. */
export default function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || readSaved() || systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Keep every toggle on the page in sync
  useEffect(() => {
    const onSync = (e) => setTheme(e.detail);
    window.addEventListener("sn-theme", onSync);
    return () => window.removeEventListener("sn-theme", onSync);
  }, []);

  // Follow the device setting until the person picks a theme themselves
  useEffect(() => {
    if (readSaved()) return undefined;
    const mq = window.matchMedia?.("(prefers-color-scheme: light)");
    if (!mq) return undefined;
    const onChange = () => setTheme(mq.matches ? "light" : "dark");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable: theme still changes for this visit */
    }
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new CustomEvent("sn-theme", { detail: next }));
  }, []);

  return { theme, toggle };
}
