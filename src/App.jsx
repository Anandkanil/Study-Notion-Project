import React, { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import "./App.css";

import ErrorBoundary from "./components/common/ErrorBoundary";
import Navbar from "./components/common/Navbar";
import ServerWakeNotice from "./components/common/ServerWakeNotice";
import PageSkeleton from "./components/common/PageSkeleton";
import PrivateRoute from "./components/core/Auth/PrivateRoute";
import { ACCOUNT_TYPE } from "./utils/constants";

// Each page loads only when it is first visited
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Contact = lazy(() => import("./pages/Contact"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const About = lazy(() => import("./pages/About"));
const PageNotFound = lazy(() => import("./pages/PageNotFound"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Catalog = lazy(() => import("./pages/Catalog"));
const CourseDetails = lazy(() => import("./pages/CourseDetails"));
const ViewCourse = lazy(() => import("./pages/ViewCourse"));
const MyProfile = lazy(() => import("./components/core/Dashboard/MyProfile"));
const Settings = lazy(() => import("./components/core/Dashboard/Settings"));
const Cart = lazy(() => import("./components/core/Dashboard/Cart"));
const EnrolledCourses = lazy(() => import("./components/core/Dashboard/EnrolledCourses"));
const Certificate = lazy(() => import("./components/core/Dashboard/Certificate"));
const Search = lazy(() => import("./pages/Search"));
const AddCourse = lazy(() => import("./components/core/Dashboard/AddCourse/index"));
const EditCourse = lazy(() => import("./components/core/Dashboard/AddCourse/CourseInformation/EditCourse/index"));
const MyCourses = lazy(() => import("./components/core/Dashboard/MyCourses"));
const Instructor = lazy(() => import("./components/core/Dashboard/InstructorDashboard/Instructor"));
const VideoDetails = lazy(() => import("./components/core/ViewCourse/VideoDetails"));

// Browser-tab titles per route (pages with live data may refine them)
const TITLES = [
  [/^\/$/, "StudyNotion — Video courses in web, cloud, AI and security"],
  [/^\/login/, "Log in"],
  [/^\/signup/, "Create your account"],
  [/^\/about/, "About"],
  [/^\/contact/, "Contact us"],
  [/^\/catalog\//, "Catalog"],
  [/^\/search/, "Search courses"],
  [/^\/courses\//, "Course"],
  [/^\/forgot-password/, "Reset your password"],
  [/^\/reset-password/, "Choose a new password"],
  [/^\/verify-email/, "Verify your email"],
  [/^\/dashboard\/my-profile/, "My profile"],
  [/^\/dashboard\/settings/, "Settings"],
  [/^\/dashboard\/cart/, "Cart"],
  [/^\/dashboard\/enrolled-courses/, "My learning"],
  [/^\/dashboard\/certificate/, "Certificate"],
  [/^\/dashboard\/instructor/, "Instructor dashboard"],
  [/^\/dashboard\/my-courses/, "My courses"],
  [/^\/dashboard\/add-course/, "New course"],
  [/^\/dashboard\/edit-course/, "Edit course"],
  [/^\/view-course/, "Lesson"],
];

function useRouteTitle(pathname) {
  useEffect(() => {
    const match = TITLES.find(([re]) => re.test(pathname));
    const title = match ? match[1] : "Page not found";
    document.title = pathname === "/" ? title : `${title} · StudyNotion`;
  }, [pathname]);
}

/** Signed-in route for one account type; other types go to their own dashboard. */
function RequireRole({ role, children, fallback }) {
  const { user } = useSelector((state) => state.profile);
  if (!user) return <Navigate to="/login" replace />;
  return user.accountType === role ? children : <Navigate to={fallback} replace />;
}

/** New page, start at the top (but keep in-page #anchors working). */
function useScrollToTop(pathname) {
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
}

function App() {
  const { user } = useSelector((state) => state.profile);
  const location = useLocation();
  useRouteTitle(location.pathname);
  useScrollToTop(location.pathname);

  const dashboardHome =
    user?.accountType === ACCOUNT_TYPE.INSTRUCTOR ? "/dashboard/instructor" : "/dashboard/enrolled-courses";

  return (
    <div className="flex min-h-screen w-full flex-col bg-bg font-sans text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-on-accent"
      >
        Skip to content
      </a>

      <Toaster
        position="top-center"
        gutter={10}
        containerStyle={{ top: 76 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: "rgb(var(--surface))",
            color: "rgb(var(--ink))",
            border: "1px solid rgb(var(--line))",
            borderRadius: "14px",
            padding: "12px 16px",
            maxWidth: "min(92vw, 440px)",
            boxShadow: "0 18px 40px -18px rgb(8 10 24 / 0.55)",
            fontFamily: "Manrope, system-ui, sans-serif",
            fontWeight: 600,
            fontSize: "15px",
            lineHeight: 1.45,
          },
          success: { iconTheme: { primary: "rgb(var(--success))", secondary: "rgb(var(--surface))" } },
          error: { duration: 6000, iconTheme: { primary: "rgb(var(--danger))", secondary: "rgb(var(--surface))" } },
          loading: { iconTheme: { primary: "rgb(var(--accent))", secondary: "rgb(var(--line))" } },
        }}
      />
      <ServerWakeNotice />

      <Navbar />

      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/catalog/:catalogName" element={<Catalog />} />
              <Route path="/search" element={<Search />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<UpdatePassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/courses/:courseId" element={<CourseDetails />} />

              {/* Signed in */}
              <Route
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              >
                <Route path="/dashboard" element={<Navigate to={dashboardHome} replace />} />
                <Route path="/dashboard/my-profile" element={<MyProfile />} />
                <Route path="/dashboard/settings" element={<Settings />} />

                <Route path="/dashboard/cart" element={<RequireRole role={ACCOUNT_TYPE.STUDENT} fallback={dashboardHome}><Cart /></RequireRole>} />
                <Route path="/dashboard/enrolled-courses" element={<RequireRole role={ACCOUNT_TYPE.STUDENT} fallback={dashboardHome}><EnrolledCourses /></RequireRole>} />
                <Route path="/dashboard/certificate/:courseId" element={<RequireRole role={ACCOUNT_TYPE.STUDENT} fallback={dashboardHome}><Certificate /></RequireRole>} />
                <Route path="/dashboard/add-course" element={<RequireRole role={ACCOUNT_TYPE.INSTRUCTOR} fallback={dashboardHome}><AddCourse /></RequireRole>} />
                <Route path="/dashboard/instructor" element={<RequireRole role={ACCOUNT_TYPE.INSTRUCTOR} fallback={dashboardHome}><Instructor /></RequireRole>} />
                <Route path="/dashboard/my-courses" element={<RequireRole role={ACCOUNT_TYPE.INSTRUCTOR} fallback={dashboardHome}><MyCourses /></RequireRole>} />
                <Route path="/dashboard/edit-course/:courseId" element={<RequireRole role={ACCOUNT_TYPE.INSTRUCTOR} fallback={dashboardHome}><EditCourse /></RequireRole>} />
              </Route>

              {/* Lesson player (students) */}
              <Route
                element={
                  <PrivateRoute>
                    <ViewCourse />
                  </PrivateRoute>
                }
              >
                <Route
                  path="/view-course/:courseId/section/:sectionId/sub-section/:subSectionId"
                  element={<RequireRole role={ACCOUNT_TYPE.STUDENT} fallback={dashboardHome}><VideoDetails /></RequireRole>}
                />
              </Route>

              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
