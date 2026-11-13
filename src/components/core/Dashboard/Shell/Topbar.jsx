import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";

import CommandSearch, { shortcutLabel } from "../../../common/CommandSearch";
import NotificationBell from "../../../common/NotificationBell";
import { ACCOUNT_TYPE, homeFor } from "../../../../utils/constants";
import { Icon } from "./AppSidebar";

// Page names for the breadcrumb, most specific first
const CRUMBS = [
  [/^\/dashboard\/overview/, "Dashboard"],
  [/^\/dashboard\/enrolled-courses/, "Your courses"],
  [/^\/dashboard\/saved-lessons/, "Saved lessons"],
  [/^\/dashboard\/wishlist/, "Wishlist"],
  [/^\/dashboard\/cart/, "Cart"],
  [/^\/dashboard\/purchases\/.+\/refund/, "Refund receipt"],
  [/^\/dashboard\/purchases\/./, "Receipt"],
  [/^\/dashboard\/purchases/, "Purchases"],
  [/^\/dashboard\/certificate/, "Certificate"],
  [/^\/dashboard\/my-profile/, "Profile"],
  [/^\/dashboard\/settings/, "Settings"],
  [/^\/dashboard\/instructor\/courses\//, "Course stats and tools"],
  [/^\/dashboard\/instructor/, "Dashboard"],
  [/^\/dashboard\/my-courses/, "My courses"],
  [/^\/dashboard\/add-course/, "New course"],
  [/^\/dashboard\/edit-course/, "Edit course"],
  [/^\/dashboard\/admin\/subjects/, "Subjects"],
  [/^\/dashboard\/admin\/paths/, "Paths"],
  [/^\/dashboard\/admin\/courses/, "Courses"],
  [/^\/dashboard\/admin\/users\/./, "User"],
  [/^\/dashboard\/admin\/users/, "Users"],
  [/^\/dashboard\/admin\/purchases/, "Sales"],
  [/^\/dashboard\/admin\/reviews/, "Reviews"],
  [/^\/dashboard\/admin\/activity/, "Activity"],
  [/^\/dashboard\/admin/, "Dashboard"],
];

const ACTION = {
  [ACCOUNT_TYPE.STUDENT]: ["Browse courses", "/search"],
  [ACCOUNT_TYPE.INSTRUCTOR]: ["New course", "/dashboard/add-course"],
  [ACCOUNT_TYPE.ADMIN]: ["Review courses", "/dashboard/admin/courses"],
};

/** Dashboard top bar: menu toggle, breadcrumb, search (Ctrl+K), notifications and a quick action. */
export default function Topbar({ onToggleSidebar, sidebarCollapsed }) {
  const { pathname } = useLocation();
  const { user } = useSelector((s) => s.profile);
  const [searchOpen, setSearchOpen] = useState(false);
  const page = CRUMBS.find(([re]) => re.test(pathname))?.[1] || "Dashboard";
  const home = homeFor(user?.accountType);
  const [actionLabel, actionTo] = ACTION[user?.accountType] || [];

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-[68px] items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-bg/60 sm:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Toggle sidebar"}
        className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-raised hover:text-ink"
      >
        <Icon d="M4 5h16v14H4zM9 5v14" />
      </button>
      <span className="hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-2 text-sm">
          <li className="hidden sm:block">
            <Link to="/" className="text-muted hover:text-ink">
              Home
            </Link>
          </li>
          <li className="hidden text-muted sm:block" aria-hidden="true">
            ›
          </li>
          {pathname !== home && page !== "Dashboard" && (
            <>
              <li className="hidden sm:block">
                <Link to={home} className="text-muted hover:text-ink">
                  Dashboard
                </Link>
              </li>
              <li className="hidden text-muted sm:block" aria-hidden="true">
                ›
              </li>
            </>
          )}
          <li className="truncate font-semibold text-ink" aria-current="page">
            {page}
          </li>
        </ol>
      </nav>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        aria-label="Search courses"
        className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-muted transition-colors hover:text-ink md:w-64"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="hidden flex-1 text-left md:block">Search</span>
        <kbd className="hidden rounded-md border border-line bg-bg px-1.5 py-0.5 font-sans text-[11px] md:block" aria-hidden="true">
          {shortcutLabel}
        </kbd>
      </button>
      <NotificationBell />
      {actionLabel && (
        <Link to={actionTo} className="hidden h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-raised lg:flex">
          {actionLabel}
        </Link>
      )}
      <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
