import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { getFullDetailsOfCourse } from "../../../../../../services/operations/courseDetailsAPI";
import { resetCourseState, setCourse, setEditCourse } from "../../../../../../slices/courseSlice";
import RenderSteps from "../../RenderSteps";
import { EmptyState, buttonClass } from "../../../../../ui";

const EditCourse = () => {
  const dispatch = useDispatch();
  const { courseId } = useParams();
  const { course } = useSelector((state) => state.course);
  const { token } = useSelector((state) => state.auth);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("loading");
      dispatch(resetCourseState());
      const result = await getFullDetailsOfCourse(courseId, token);
      if (!alive) return;
      if (result?.courseDetails) {
        dispatch(setEditCourse(true));
        dispatch(setCourse(result.courseDetails));
        setStatus("ready");
      } else {
        setStatus("missing");
      }
    })();
    return () => {
      alive = false;
    };
  }, [courseId, dispatch, token]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Edit course</h1>
        {course?.courseName && status === "ready" && <p className="mt-1 text-muted">{course.courseName}</p>}
      </div>
      {status === "loading" && (
        <div className="flex flex-col gap-4" role="status" aria-label="Loading course">
          <div className="skeleton h-9 w-full max-w-lg" />
          <div className="skeleton h-80 w-full rounded-2xl" />
        </div>
      )}
      {status === "missing" && (
        <EmptyState as="h2" title="This course couldn't be opened" action={<Link to="/dashboard/my-courses" className={buttonClass("secondary")}>Back to my courses</Link>}>
          It may have been deleted, or it belongs to another instructor.
        </EmptyState>
      )}
      {status === "ready" && <RenderSteps />}
    </div>
  );
};

export default EditCourse;
