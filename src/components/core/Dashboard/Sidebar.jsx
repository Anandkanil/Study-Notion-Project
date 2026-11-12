import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../../services/operations/authAPI";
import { ACCOUNT_TYPE } from "../../../utils/constants";
import ConfirmationModal from "../../common/ConfirmationModal";

const ICONS = {
  learn: "M4 5h11a5 5 0 015 5v9H9a5 5 0 01-5-5z",
  cart: "M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.5L21 8H6",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  courses: "M4 6h16M4 12h16M4 18h10",
  add: "M12 5v14M5 12h14",
  profile: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  heart: "M12 20s-7-4.4-9.2-8.6C1.2 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.1 1.8-1.9 3.3-3.1 5.4-3.1 3.6 0 5.4 3.8 3.8 6.9C19 15.6 12 20 12 20z",
  star: "M12 2l3 7 7.5.6-5.7 4.9 1.8 7.5L12 18l-6.6 4 1.8-7.5L1.5 9.6 9 9z",
  log: "M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  tag: "M3 12V4a1 1 0 011-1h8l9 9-9 9-9-9zM7.5 7.5h.01",
  users: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
};

const Icon = ({ d }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    <path d={d} />
  </svg>
);

const LINKS = {
  [ACCOUNT_TYPE.STUDENT]: [
    ["My learning", "/dashboard/enrolled-courses", ICONS.learn],
    ["Wishlist", "/dashboard/wishlist", ICONS.heart],
    ["Cart", "/dashboard/cart", ICONS.cart],
    ["Purchases", "/dashboard/purchases", ICONS.receipt],
  ],
  [ACCOUNT_TYPE.ADMIN]: [
    ["Overview", "/dashboard/admin", ICONS.chart, true],
    ["Subjects", "/dashboard/admin/subjects", ICONS.tag],
    ["Courses", "/dashboard/admin/courses", ICONS.courses],
    ["Users", "/dashboard/admin/users", ICONS.users],
    ["Sales", "/dashboard/admin/purchases", ICONS.receipt],
    ["Reviews", "/dashboard/admin/reviews", ICONS.star],
    ["Activity", "/dashboard/admin/activity", ICONS.log],
  ],
  [ACCOUNT_TYPE.INSTRUCTOR]: [
    ["Overview", "/dashboard/instructor", ICONS.chart],
    ["My courses", "/dashboard/my-courses", ICONS.courses],
    ["New course", "/dashboard/add-course", ICONS.add],
  ],
};

const itemClass = ({ isActive }) =>
  `flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 font-semibold transition-colors ${
    isActive ? "bg-accent text-on-accent" : "text-muted hover:bg-raised hover:text-ink"
  }`;

export default function Sidebar() {
  const { user } = useSelector((state) => state.profile);
  const totalItems = useSelector((state) => state.cart.totalItems);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null);

  const links = LINKS[user?.accountType] || [];

  return (
    <>
      <nav
        aria-label="Dashboard"
        className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-60 lg:shrink-0 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:px-3 lg:py-6"
      >
        {links.map(([label, to, icon, end]) => (
          <NavLink key={to} to={to} end={end} className={itemClass}>
            <Icon d={icon} />
            {label}
            {to === "/dashboard/cart" && totalItems > 0 && (
              <span className="ml-auto rounded-md bg-raised px-1.5 text-sm text-ink">{totalItems}</span>
            )}
          </NavLink>
        ))}
        <div className="hidden lg:my-3 lg:block lg:border-t lg:border-line" />
        <NavLink to="/dashboard/my-profile" className={itemClass}>
          <Icon d={ICONS.profile} />
          Profile
        </NavLink>
        <NavLink to="/dashboard/settings" className={itemClass}>
          <Icon d={ICONS.settings} />
          Settings
        </NavLink>
        <button
          type="button"
          onClick={() =>
            setConfirm({
              text1: "Log out?",
              text2: "You'll need your email and password to log back in.",
              btn1Text: "Log out",
              btn2Text: "Stay logged in",
              btn1Handler: () => {
                setConfirm(null);
                dispatch(logout(navigate));
              },
              btn2Handler: () => setConfirm(null),
            })
          }
          className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left font-semibold text-muted hover:bg-raised hover:text-ink lg:mt-auto"
        >
          <Icon d={ICONS.logout} />
          Log out
        </button>
      </nav>
      {confirm && <ConfirmationModal modalData={confirm} />}
    </>
  );
}
