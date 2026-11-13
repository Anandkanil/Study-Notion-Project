import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, matchPath, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import ProfileDropDown from "../core/Auth/ProfileDropDown";
import ThemeToggle from "./ThemeToggle";
import CommandSearch, { shortcutLabel } from "./CommandSearch";
import NotificationBell from "./NotificationBell";
import Logo from "./Logo";
import useOnClickOutside from "../../hooks/useOnClickOutside";
import { apiConnector } from "../../services/apiconnector";
import { categories } from "../../services/apis";

export const categorySlug = (name = "") => name.split(" ").join("-").toLowerCase();

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 font-semibold transition-colors ${isActive ? "text-ink bg-raised" : "text-muted hover:text-ink"}`;

const Navbar = () => {
  const [subLinks, setSubLinks] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const catalogRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const onSearchPage = location.pathname === "/search";
  const token = useSelector((state) => state.auth.token);
  const { user } = useSelector((state) => state.profile);
  const totalItems = useSelector((state) => state.cart.totalItems);

  useOnClickOutside(catalogRef, () => setCatalogOpen(false));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const result = await apiConnector("GET", categories.CATEGORIES_API);
        if (alive) setSubLinks(result.data?.data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        if (alive) setCatsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Close menus on navigation and on Escape
  useEffect(() => {
    setMobileOpen(false);
    setCatalogOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setCatalogOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Ctrl+K / ⌘K opens search from anywhere; "/" too, unless you're typing
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

  const withCourses = subLinks.filter((c) => c?.courses?.length > 0);
  const onCatalog = Boolean(matchPath({ path: "/catalog/:catalogName" }, location.pathname));
  const isStudent = user?.accountType === "Student";

  const categoryList = (onPick) =>
    catsLoading ? (
      <div className="flex flex-col gap-2 p-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-9" />
        ))}
      </div>
    ) : withCourses.length ? (
      withCourses.map((c) => (
        <Link
          key={c._id}
          to={`/catalog/${categorySlug(c.name)}`}
          onClick={onPick}
          className="block rounded-xl px-3 py-2.5 text-ink hover:bg-raised"
        >
          {c.name}
        </Link>
      ))
    ) : (
      <p className="px-3 py-2 text-muted">Subjects couldn't load. Try again in a moment.</p>
    );

  return (
    <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-bg/80 backdrop-blur-md supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        <Logo />

        <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          <div className="relative" ref={catalogRef}>
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={catalogOpen}
              onClick={() => setCatalogOpen((o) => !o)}
              className={`flex items-center gap-1 rounded-lg px-3 py-2 font-semibold transition-colors ${onCatalog || catalogOpen ? "bg-raised text-ink" : "text-muted hover:text-ink"}`}
            >
              Catalog
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true" className={`transition-transform ${catalogOpen ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {catalogOpen && (
              <div className="absolute left-0 top-[calc(100%+8px)] w-72 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-pop)]">
                {categoryList(() => setCatalogOpen(false))}
              </div>
            )}
          </div>
          <NavLink to="/about" className={linkClass}>
            About
          </NavLink>
          <NavLink to="/contact" className={linkClass}>
            Contact
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-keyshortcuts="Control+K Meta+K"
            className="hidden h-11 items-center gap-2 rounded-xl border border-line bg-surface pl-3 pr-2 text-muted transition-colors hover:text-ink xl:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <span className="w-32 text-left">Search courses</span>
            <kbd className="rounded-md border border-line bg-bg px-1.5 py-0.5 font-sans text-xs" aria-hidden="true">{shortcutLabel}</kbd>
          </button>
          {(
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search courses"
              className="hidden h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink hover:bg-raised sm:grid xl:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </button>
          )}
          <ThemeToggle />
          {isStudent && (
            <Link
              to="/dashboard/cart"
              aria-label={totalItems > 0 ? `Cart, ${totalItems} item${totalItems === 1 ? "" : "s"}` : "Cart"}
              className="relative grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-ink hover:bg-raised"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.5L21 8H6" />
                <circle cx="9.5" cy="20" r="1.3" />
                <circle cx="17" cy="20" r="1.3" />
              </svg>
              {totalItems > 0 && (
                <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent">
                  {totalItems}
                </span>
              )}
            </Link>
          )}

          {token === null ? (
            <>
              <Link to="/login" className="hidden rounded-xl px-4 py-2.5 font-semibold text-ink hover:bg-raised sm:inline-block">
                Log in
              </Link>
              <Link to="/signup" className="btn-grad whitespace-nowrap rounded-xl px-4 py-2.5 font-bold">
                <span className="sm:hidden">Join</span>
                <span className="hidden sm:inline">Start learning</span>
              </Link>
            </>
          ) : (
            user && (
              <>
                <NotificationBell />
                <ProfileDropDown />
              </>
            )
          )}
        </div>
      </div>

      <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {mobileOpen && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-surface px-4 pb-6 pt-3 lg:hidden">
          {!onSearchPage && (
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const q = searchText.trim();
                navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
                setSearchText("");
              }}
              className="mb-2 flex h-12 items-center gap-2 rounded-xl border border-field bg-bg px-3 text-muted focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 sm:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <label htmlFor="mobile-search" className="sr-only">
                Search courses
              </label>
              <input
                id="mobile-search"
                type="search"
                enterKeyHint="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search courses"
                className="w-full bg-transparent text-ink placeholder:text-muted focus:outline-none"
              />
            </form>
          )}
          <p className="px-3 pb-1 pt-2 text-sm font-semibold text-muted">Subjects</p>
          {categoryList(() => setMobileOpen(false))}
          <div className="mt-3 flex flex-col border-t border-line pt-3">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>
            <NavLink to="/about" className={linkClass}>
              About
            </NavLink>
            <NavLink to="/contact" className={linkClass}>
              Contact
            </NavLink>
            {token === null && (
              <NavLink to="/login" className={linkClass}>
                Log in
              </NavLink>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
