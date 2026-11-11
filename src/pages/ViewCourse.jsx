import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Outlet, useParams } from "react-router-dom";

import CourseReviewModal from "../components/core/ViewCourse/CourseReviewModal";
import VideoDetailsSideBar from "../components/core/ViewCourse/VideoDetailsSideBar";
import { Button, EmptyState, buttonClass } from "../components/ui";
import { apiConnector } from "../services/apiconnector";
import { courseEndpoints } from "../services/apis";
import { setCompletedLectures, setCourseSectionData, setEntireCourseData, setTotalNoOfLectures } from "../slices/viewCourseSlice";

export default function ViewCourse() {
  const { courseId } = useParams();
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [reviewModal, setReviewModal] = useState(false);
  const [status, setStatus] = useState("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiConnector("POST", courseEndpoints.GET_FULL_COURSE_DETAILS_AUTHENTICATED, { courseId }, { Authorization: `Bearer ${token}` });
      const data = res.data?.data;
      if (!data?.courseDetails) throw new Error("No course");
      dispatch(setCourseSectionData(data.courseDetails.courseContent || []));
      dispatch(setEntireCourseData(data.courseDetails));
      dispatch(setCompletedLectures(data.completedVideos || []));
      dispatch(setTotalNoOfLectures((data.courseDetails.courseContent || []).reduce((n, s) => n + (s.subSection?.length || 0), 0)));
      document.title = `${data.courseDetails.courseName} · StudyNotion`;
      setStatus("ready");
    } catch (error) {
      setStatus(error?.response?.status === 403 ? "forbidden" : "error");
    }
  }, [courseId, token, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  if (status !== "ready") {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-14">
        {status === "loading" ? (
          <div className="flex flex-col gap-4" role="status" aria-label="Loading lesson">
            <div className="skeleton aspect-video w-full rounded-2xl" />
            <div className="skeleton h-7 w-2/3" />
          </div>
        ) : status === "forbidden" ? (
          <EmptyState as="h1" title="You're not enrolled in this course" action={<Link to={`/courses/${courseId}`} className={buttonClass("primary")}>See the course</Link>}>
            Buy the course to watch its lessons.
          </EmptyState>
        ) : (
          <EmptyState as="h1" title="This lesson couldn't load" action={<Button variant="secondary" onClick={load}>Try again</Button>}>
            The server may still be waking up. This usually takes under a minute.
          </EmptyState>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col lg:flex-row">
        <VideoDetailsSideBar setReviewModal={setReviewModal} />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
            <Outlet />
          </div>
        </div>
      </div>
      {reviewModal && <CourseReviewModal setReviewModal={setReviewModal} />}
    </>
  );
}
