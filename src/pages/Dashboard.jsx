import React, { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import AppSidebar from "../components/core/Dashboard/Shell/AppSidebar";
import Topbar from "../components/core/Dashboard/Shell/Topbar";
import PageSkeleton from "../components/common/PageSkeleton";

const COLLAPSE_KEY = "sn-sidebar-collapsed";

/** Full-screen dashboard (no site navbar): sidebar on the left, top bar and the page on the right. */
const Dashboard = () => {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  const toggle = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setCollapsed((c) => {
        try {
          localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
        } catch {
          /* not remembered */
        }
        return !c;
      });
    } else {
      setMobileOpen(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-1">
      <AppSidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={toggle} sidebarCollapsed={collapsed} />
        <div className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-7 sm:px-7 lg:py-9">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
