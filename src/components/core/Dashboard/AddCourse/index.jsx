import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { resetCourseState } from "../../../../slices/courseSlice";
import RenderSteps from "./RenderSteps";

export default function AddCourse() {
  const dispatch = useDispatch();
  // Start from a clean form, even right after editing another course
  useEffect(() => {
    dispatch(resetCourseState());
  }, [dispatch]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">New course</h1>
        <p className="mt-1 text-muted">Three steps: details, lessons, publish. Your progress is saved as a draft after step 1.</p>
      </div>
      <RenderSteps />
    </div>
  );
}
