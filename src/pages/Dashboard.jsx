import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/core/Dashboard/Sidebar";
import PageSkeleton from "../components/common/PageSkeleton";

const Dashboard = () => (
  <div className="flex flex-1 flex-col lg:flex-row">
    <Sidebar />
    <div className="min-w-0 flex-1">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  </div>
);

export default Dashboard;
