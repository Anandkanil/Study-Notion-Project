import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import useTheme from "../../../../hooks/useTheme";
import useOnClickOutside from "../../../../hooks/useOnClickOutside";
import { logout } from "../../../../services/operations/authAPI";
import { ACCOUNT_TYPE } from "../../../../utils/constants";
import ConfirmationModal from "../../../common/ConfirmationModal";
import { LogoMark } from "../../../common/Logo";

export const ICONS = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  cap: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5M12 17h.01",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  chevron: "M9 6l6 6-6 6",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  home: "M3 11l9-8 9 8M5 10v10h14V10",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
};

export const Icon = ({ d, size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
    <path d={d} />
  </svg>
);

/** Menu per role. A group has children; a plain item has `to`. `end` = exact match only. */
const MENUS = {
  [ACCOUNT_TYPE.STUDENT]: [
    { label: "Dashboard", to: "/dashboard/overview", icon: ICONS.grid },
    {
      label: "Courses",
      icon: ICONS.cap,
      children: [
        ["Your courses", "/dashboard/enrolled-courses"],
        ["Browse courses", "/search"],
        ["Wishlist", "/dashboard/wishlist"],
        ["Cart", "/dashboard/cart"],
      ],
    },
    {
      label: "Learn",
      icon: ICONS.book,
      children: [
        ["Guided paths", "/paths"],
        ["Saved lessons", "/dashboard/saved-lessons"],
        ["Code playground", "/playground"],
      ],
    },
    {
      label: "Account",
      icon: ICONS.user,
      children: [
        ["Purchases", "/dashboard/purchases"],
        ["Profile", "/dashboard/my-profile"],
        ["Settings", "/dashboard/settings"],
      ],
    },
    { label: "Help", to: "/contact", icon: ICONS.help },
  ],
  [ACCOUNT_TYPE.INSTRUCTOR]: [
    { label: "Dashboard", to: "/dashboard/instructor", icon: ICONS.grid },
    {
      label: "Courses",
      icon: ICONS.cap,
      children: [
        ["My courses", "/dashboard/my-courses"],
        ["New course", "/dashboard/add-course"],
      ],
    },
    { label: "Learn", icon: ICONS.book, children: [["Code playground", "/playground"], ["Guided paths", "/paths"]] },
    {
      label: "Account",
      icon: ICONS.user,
      children: [
        ["Profile", "/dashboard/my-profile"],
        ["Settings", "/dashboard/settings"],
      ],
    },
    { label: "Help", to: "/contact", icon: ICONS.help },
  ],
  [ACCOUNT_TYPE.ADMIN]: [
    { label: "Dashboard", to: "/dashboard/admin", icon: ICONS.grid, end: true },
    {
      label: "Manage",
      icon: ICONS.shield,
      children: [
        ["Courses", "/dashboard/admin/courses"],
        ["Subjects", "/dashboard/admin/subjects"],
        ["Paths", "/dashboard/admin/paths"],
        ["Users", "/dashboard/admin/users"],
      ],
    },
    {
      label: "Business",
      icon: ICONS.chart,
      children: [
        ["Sales", "/dashboard/admin/purchases"],
        ["Reviews", "/dashboard/admin/reviews"],
        ["Activity", "/dashboard/admin/activity"],
      ],
    },
    {
      label: "Account",
      icon: ICONS.user,
      children: [
        ["Profile", "/dashboard/my-profile"],
        ["Settings", "/dashboard/settings"],
      ],
    },
  ],
};

const PROMOS = {
  [ACCOUNT_TYPE.STUDENT]: { title: "Follow a guided path", body: "Courses in the right order, with progress across all of them.", cta: "Explore paths", to: "/paths" },
  [ACCOUNT_TYPE.INSTRUCTOR]: { title: "Teach your next course", body: "Draft it, send it for review, and we'll publish it once it's approved.", cta: "New course", to: "/dashboard/add-course" },
};

const PROMO_KEY = "sn-promo-hidden";
const OPEN_KEY = "sn-sidebar-groups";

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

const rowClass = (active, collapsed) =>
  `group flex min-h-[40px] w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors ${collapsed ? "justify-center px-0" : ""} ${
    active ? "bg-raised text-ink shadow-[inset_0_0_0_1px_rgb(var(--ink)/0.06)]" : "text-muted hover:bg-raised/70 hover:text-ink"
  }`;

function UserMenu({ user, collapsed, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOnClickOutside(ref, () => setOpen(false));
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const name = [user?.firstName, user?.lastName].filter((x) => x && x !== "-").join(" ");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={collapsed ? `Account menu for ${name}` : undefined}
        className={`flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-2 text-left transition-colors hover:bg-raised ${collapsed ? "justify-center" : ""}`}
      >
        <img src={user?.image} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{name}</span>
              <span className="block truncate text-xs text-muted">{user?.email}</span>
            </span>
            <Icon d={ICONS.chevron} size={16} className="text-muted" />
          </>
        )}
      </button>
      {open && (
        <div role="menu" className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-56 overflow-hidden rounded-2xl border border-ink/10 bg-surface p-1.5 shadow-[var(--shadow-pop)]">
          {[
            ["Profile", "/dashboard/my-profile", ICONS.user],
            ["Settings", "/dashboard/settings", ICONS.settings],
            ["Home page", "/", ICONS.home],
          ].map(([label, to, icon]) => (
            <Link key={to} role="menuitem" to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-raised">
              <Icon d={icon} size={16} className="text-muted" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-danger hover:bg-raised"
          >
            <Icon d={ICONS.logout} size={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The dashboard's left sidebar, in the style of codehelp.in: grouped links that fold open,
 * a dismissible tip card, the light/dark switch (Ctrl+M) and the account card.
 * collapsed = icon-only rail on large screens; on small screens it's a drawer.
 */
export default function AppSidebar({ collapsed, mobileOpen, onCloseMobile }) {
  const { user } = useSelector((s) => s.profile);
  const totalItems = useSelector((s) => s.cart.totalItems);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const [confirm, setConfirm] = useState(null);
  const [promoHidden, setPromoHidden] = useState(() => readJSON(PROMO_KEY, false));
  const menu = MENUS[user?.accountType] || [];
  const isActive = (to, end) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));

  // Groups start open when they hold the current page; the user's choices are remembered
  const [openGroups, setOpenGroups] = useState(() => readJSON(OPEN_KEY, {}));
  const groupOpen = (g) => openGroups[g.label] ?? g.children.some(([, to]) => isActive(to));
  const toggleGroup = (g) =>
    setOpenGroups((o) => {
      const next = { ...o, [g.label]: !groupOpen(g) };
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        /* not remembered */
      }
      return next;
    });

  // Ctrl+M switches light/dark from anywhere in the dashboard
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  const askLogout = () =>
    setConfirm({
      tone: "warning",
      text1: "Log out of StudyNotion?",
      text2: "You'll need to sign in again to keep learning on this device.",
      btn1Text: "Log out",
      btn2Text: "Stay",
      btn1Handler: () => {
        setConfirm(null);
        dispatch(logout(navigate));
      },
      btn2Handler: () => setConfirm(null),
    });

  const promo = PROMOS[user?.accountType];
  const hidePromo = () => {
    setPromoHidden(true);
    try {
      localStorage.setItem(PROMO_KEY, "true");
    } catch {
      /* not remembered */
    }
  };

  const linkIcon = (to) =>
    to === "/dashboard/cart" && totalItems > 0 ? <span className="ml-auto rounded-md bg-accent/20 px-1.5 text-xs font-semibold text-accent-text">{totalItems}</span> : null;

  // Desktop can fold to an icon rail; the phone drawer always shows labels
  const renderBody = (collapsed) => (
    <div className="flex h-full flex-col gap-2 px-3 pb-3">
      <Link to="/" className={`flex h-[68px] shrink-0 items-center gap-2.5 border-b border-line ${collapsed ? "justify-center" : "px-2"}`} aria-label="StudyNotion home">
        <LogoMark size={32} />
        {!collapsed && <span className="text-xl font-bold tracking-tight text-ink">StudyNotion</span>}
      </Link>

      <nav aria-label="Dashboard" className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto">
        {menu.map((item) =>
          item.children ? (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => (collapsed ? navigate(item.children[0][1]) : toggleGroup(item))}
                aria-expanded={collapsed ? undefined : groupOpen(item)}
                title={collapsed ? item.label : undefined}
                className={rowClass(false, collapsed)}
              >
                <Icon d={item.icon} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    <Icon d={ICONS.chevron} size={16} className={`transition-transform ${groupOpen(item) ? "rotate-90" : ""}`} />
                  </>
                )}
              </button>
              {!collapsed && groupOpen(item) && (
                <ul className="mb-1 ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l border-line pl-3">
                  {item.children.map(([label, to]) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={onCloseMobile}
                        className={() =>
                          `flex min-h-[36px] items-center rounded-lg px-2.5 text-sm transition-colors ${isActive(to) ? "bg-raised font-semibold text-ink" : "text-muted hover:text-ink"}`
                        }
                      >
                        {label}
                        {linkIcon(to)}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={onCloseMobile} title={collapsed ? item.label : undefined} className={() => rowClass(isActive(item.to, item.end), collapsed)}>
              <Icon d={item.icon} />
              {!collapsed && item.label}
            </NavLink>
          )
        )}
      </nav>

      {!collapsed && promo && !promoHidden && (
        <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-b from-accent/20 to-surface p-4">
          <button type="button" onClick={hidePromo} aria-label="Hide this tip" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-raised hover:text-ink">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <p className="pr-6 font-semibold text-ink">{promo.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{promo.body}</p>
          <Link to={promo.to} onClick={onCloseMobile} className="btn-grad mt-3 flex min-h-[40px] items-center justify-center rounded-xl text-sm font-semibold">
            {promo.cta}
          </Link>
        </div>
      )}

      <button type="button" onClick={toggle} aria-keyshortcuts="Control+M" title={collapsed ? (theme === "dark" ? "Light mode (Ctrl+M)" : "Dark mode (Ctrl+M)") : undefined} className={rowClass(false, collapsed)}>
        <Icon d={theme === "dark" ? ICONS.sun : ICONS.moon} />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            <kbd className="font-sans text-[11px] text-muted">Ctrl+M</kbd>
          </>
        )}
      </button>

      <UserMenu user={user} collapsed={collapsed} onLogout={askLogout} />
    </div>
  );

  return (
    <>
      <aside className={`sticky top-0 hidden h-screen shrink-0 border-r border-line bg-bg transition-[width] duration-200 lg:block ${collapsed ? "w-[76px]" : "w-[256px]"}`}>{renderBody(collapsed)}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button type="button" aria-label="Close menu" onClick={onCloseMobile} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-line bg-bg shadow-[var(--shadow-pop)]">{renderBody(false)}</aside>
        </div>
      )}
      {confirm && <ConfirmationModal modalData={confirm} />}
    </>
  );
}
