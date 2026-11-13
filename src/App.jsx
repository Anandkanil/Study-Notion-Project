import React, { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import "./App.css";

import ErrorBoundary from "./components/common/ErrorBoundary";
import Navbar from "./components/common/Navbar";
import ServerWakeNotice from "./components/common/ServerWakeNotice";
import DemoBanner from "./components/common/DemoBanner";
import PageSkeleton from "./components/common/PageSkeleton";
import PrivateRoute from "./components/core/Auth/PrivateRoute";
import { ACCOUNT_TYPE, homeFor } from "./utils/constants";
import { loadWishlist } from "./slices/wishlistSlice";
import { loadSavedLessons } from "./slices/savedLessonsSlice";

// Each page loads only when it is first visited
const Home = lazy(() => import("./pages/Home"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
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
const Purchases = lazy(() => import("./components/core/Dashboard/Purchases"));
const GithubCallback = lazy(() => import("./pages/GithubCallback"));
const PlaygroundPage = lazy(() => import("./pages/PlaygroundPage"));
const Wishlist = lazy(() => import("./components/core/Dashboard/Wishlist"));
const SavedLessons = lazy(() => import("./components/core/Dashboard/SavedLessons"));
const StudentOverview = lazy(() => import("./components/core/Dashboard/StudentOverview"));
const InstructorCourse = lazy(() => import("./components/core/Dashboard/InstructorCourse"));
const AdminOverview = lazy(() => import("./components/core/Dashboard/Admin/Overview"));
const AdminSubjects = lazy(() => import("./components/core/Dashboard/Admin/Subjects"));
const AdminPaths = lazy(() => import("./components/core/Dashboard/Admin/Paths"));
const Paths = lazy(() => import("./pages/Paths"));
const PathDetail = lazy(() => import("./pages/PathDetail"));
const AdminCourses = lazy(() => import("./components/core/Dashboard/Admin/Courses"));
const AdminUsers = lazy(() => import("./components/core/Dashboard/Admin/Users"));
const AdminUserDetail = lazy(() => import("./components/core/Dashboard/Admin/Users").then((m) => ({ default: m.AdminUserDetail })));
const AdminPurchases = lazy(() => import("./components/core/Dashboard/Admin/Purchases"));
const AdminReviews = lazy(() => import("./components/core/Dashboard/Admin/Reviews"));
const AdminActivity = lazy(() => import("./components/core/Dashboard/Admin/Activity"));
const Receipt = lazy(() => import("./components/core/Dashboard/Purchases").then((m) => ({ default: m.Receipt })));
const Search = lazy(() => import("./pages/Search"));
const AddCourse = lazy(() => import("./components/core/Dashboard/AddCourse/index"));
const EditCourse = lazy(() => import("./components/core/Dashboard/AddCourse/CourseInformation/EditCourse/index"));
const MyCourses = lazy(() => import("./components/core/Dashboard/MyCourses"));
const Instructor = lazy(() => import("./components/core/Dashboard/InstructorDashboard/Instructor"));
const VideoDetails = lazy(() => import("./components/core/ViewCourse/VideoDetails"));
const Legal = lazy(() => import("./pages/Legal"));

// Browser-tab titles per route (pages with live data may refine them)
export const TITLES = [
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
  [/^\/dashboard\/enrolled-courses/, "Your courses"],
  [/^\/dashboard\/overview/, "Dashboard"],
  [/^\/dashboard\/certificate/, "Certificate"],
  [/^\/dashboard\/admin\/subjects/, "Subjects · Admin"],
  [/^\/dashboard\/admin\/paths/, "Paths · Admin"],
  [/^\/dashboard\/admin\/courses/, "Courses · Admin"],
  [/^\/dashboard\/admin\/users/, "Users · Admin"],
  [/^\/dashboard\/admin\/purchases/, "Sales · Admin"],
  [/^\/dashboard\/admin\/reviews/, "Reviews · Admin"],
  [/^\/dashboard\/admin\/activity/, "Activity · Admin"],
  [/^\/dashboard\/admin/, "Admin overview"],
  [/^\/dashboard\/purchases\/.+\/refund/, "Refund receipt"],
  [/^\/dashboard\/purchases\/./, "Receipt"],
  [/^\/dashboard\/purchases/, "Purchases"],
  [/^\/dashboard\/wishlist/, "Wishlist"],
  [/^\/dashboard\/saved-lessons/, "Saved lessons"],
  [/^\/dashboard\/instructor\/courses\//, "Course stats and tools"],
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
/** Tells people once when the connection drops, instead of every action failing silently. */
function useOfflineNotice() {
  useEffect(() => {
    const offline = () =>
      toast.error("You're offline. Actions will work again when you reconnect.", { id: "connection", duration: Infinity });
    const online = () => toast.success("You're back online", { id: "connection", duration: 3000 });
    if (typeof navigator !== "undefined" && navigator.onLine === false) offline();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);
}

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
  useOfflineNotice();

  // Students: load saved courses once per login, for the hearts on course cards
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const wishlistLoaded = useSelector((state) => state.wishlist.loaded);
  useEffect(() => {
    if (token && user?.accountType === ACCOUNT_TYPE.STUDENT && !wishlistLoaded) dispatch(loadWishlist(token));
  }, [token, user?.accountType, wishlistLoaded, dispatch]);
  const savedLoaded = useSelector((state) => state.savedLessons.loaded);
  useEffect(() => {
    if (token && user?.accountType === ACCOUNT_TYPE.STUDENT && !savedLoaded) dispatch(loadSavedLessons(token));
  }, [token, user?.accountType, savedLoaded, dispatch]);

  const dashboardHome = homeFor(user?.accountType);

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
      <DemoBanner />

      {!location.pathname.startsWith("/dashboard") && <Navbar />}

      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/playground" element={<PlaygroundPage />} />
              <Route path="/paths" element={<Paths />} />
              <Route path="/verify" element={<VerifyCertificate />} />
              <Route path="/verify/:code" element={<VerifyCertificate />} />
              <Route path="/paths/:slug" element={<PathDetail />} />
              <Route path="/auth/github/callback" element={<GithubCallback />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Legal page="privacy" />} />
              <Route path="/terms" element={<Legal page="terms" />} />
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
                <Route path="/dashboard/instructor/courses/:courseId" element={<RequireRole role={ACCOUNT_TYPE.INSTRUCTOR} fallback={dashboardHome}><InstructorCourse /></RequireRole>} />
                <Route path="/dashboard/wishlist" element={<RequireRole role={ACCOUNT_TYPE.STUDENT} fallback={dashboardHome}><Wishlist /></RequireRole>} />
                <Route path="/dashboard/saved-lessons" element={<RequireRole role={ACCOUNT_TYPE.STUDENT} fallback={dashboardHome}><SavedLessons /></RequireRole>} />
                <Route path="/dashboard/overview" element={<RequireRole role={ACCOUNT_TYPE.STUDENT} fallback={dashboardHome}><StudentOverview /></RequireRole>} />
                <Route path="/dashboard/purchases" element={<RequireRole role={ACCOUNT_TYPE.STUDENT} fallback={dashboardHome}><Purchases /></RequireRole>} />
                <Route path="/dashboard/purchases/:orderId" element={<RequireRole role={ACCOUNT_TYPE.STUDENT} fallback={dashboardHome}><Receipt /></RequireRole>} />
                <Route path="/dashboard/purchases/:orderId/refund" element={<RequireRole role={ACCOUNT_TYPE.STUDENT} fallback={dashboardHome}><Receipt refund /></RequireRole>} />
                <Route path="/dashboard/admin" element={<RequireRole role={ACCOUNT_TYPE.ADMIN} fallback={dashboardHome}><AdminOverview /></RequireRole>} />
                <Route path="/dashboard/admin/subjects" element={<RequireRole role={ACCOUNT_TYPE.ADMIN} fallback={dashboardHome}><AdminSubjects /></RequireRole>} />
                <Route path="/dashboard/admin/paths" element={<RequireRole role={ACCOUNT_TYPE.ADMIN} fallback={dashboardHome}><AdminPaths /></RequireRole>} />
                <Route path="/dashboard/admin/courses" element={<RequireRole role={ACCOUNT_TYPE.ADMIN} fallback={dashboardHome}><AdminCourses /></RequireRole>} />
                <Route path="/dashboard/admin/users" element={<RequireRole role={ACCOUNT_TYPE.ADMIN} fallback={dashboardHome}><AdminUsers /></RequireRole>} />
                <Route path="/dashboard/admin/users/:id" element={<RequireRole role={ACCOUNT_TYPE.ADMIN} fallback={dashboardHome}><AdminUserDetail /></RequireRole>} />
                <Route path="/dashboard/admin/purchases" element={<RequireRole role={ACCOUNT_TYPE.ADMIN} fallback={dashboardHome}><AdminPurchases /></RequireRole>} />
                <Route path="/dashboard/admin/reviews" element={<RequireRole role={ACCOUNT_TYPE.ADMIN} fallback={dashboardHome}><AdminReviews /></RequireRole>} />
                <Route path="/dashboard/admin/activity" element={<RequireRole role={ACCOUNT_TYPE.ADMIN} fallback={dashboardHome}><AdminActivity /></RequireRole>} />
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
