import React, { useState } from "react";
import { useForm } from "react-hook-form"; // Importing react-hook-form for form handling
import IconBtn from "../../../../common/IconBtn"; // Importing custom IconBtn component
import { GrAddCircle, GrEdit } from "react-icons/gr"; // Importing icons for Add and Edit actions
import { useDispatch, useSelector } from "react-redux"; // Importing Redux hooks
import NestedView from "./NestedView"; // Component for rendering nested course sections
import {
  createSection,
  updateSection,
} from "../../../../../services/operations/courseDetailsAPI"; // API functions for creating and updating sections
import { setCourse } from "../../../../../slices/courseSlice"; // Redux action for updating course state

const CourseBuilderForm2 = () => {
  const dispatch = useDispatch(); // Redux dispatch function

  // Using react-hook-form to manage form state and validation
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm();

  // State for controlling the editing of sections
  const [editingSectionId, setEditingSectionId] = useState(null);

  // Loading state for API requests
  const [loading, setLoading] = useState(false);

  // Accessing the authentication token and course from Redux store
  const token = useSelector((state) => state.auth.token);
  const { course } = useSelector((state) => state.course);

  // Function to handle switching to edit mode or canceling edit
  const handleEditSection = (sectionId, sectionName) => {
    if (sectionId === editingSectionId) {
      cancelEdit(); // Cancel edit if the same section is clicked
    } else {
      setEditingSectionId(sectionId); // Set the section being edited
      setValue("sectionName", sectionName); // Populate the form with the section name
    }
  };

  // Function to handle form submission (Create/Update section)
  const onSubmit = async (data) => {
    setLoading(true);

    try {
      let result;
      if (editingSectionId) {
        // Update existing section
        result = await updateSection(
          {
            sectionName: data.sectionName,
            sectionId: editingSectionId,
            courseId: course._id,
          },
          token
        );
      } else {
        // Create a new section
        result = await createSection(
          {
            sectionName: data.sectionName,
            courseId: course._id,
          },
          token
        );
      }

      if (result) {
        // Update Redux state with the new course data
        dispatch(setCourse(result));
        resetFormState();
      }
    } catch (error) {
      console.error("Error creating/updating section:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to cancel editing and reset the form
  const cancelEdit = () => {
    setEditingSectionId(null);
    resetFormState();
  };

  // Function to reset form state
  const resetFormState = () => {
    reset(); // Reset react-hook-form fields
    setValue("sectionName", ""); // Clear the section name input
  };

  return (
    <div>
      <p>Course Builder</p>

      {/* Form for adding/editing section name */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label htmlFor="sectionName">Section Name</label>
          <input
            type="text"
            id="sectionName"
            placeholder="Add Section Name"
            {...register("sectionName", { required: true })}
          />
          {errors.sectionName && (
            <span className="text-red-500">Section Name is required</span>
          )}
        </div>

        {/* Buttons for creating/editing the section */}
        <div className="flex gap-2 items-center">
          <IconBtn
            type="submit"
            text={editingSectionId ? "Edit Section" : "Create Section"}
            className="flex items-center justify-between gap-3"
            outline={true}
          >
            {editingSectionId ? <GrEdit /> : <GrAddCircle />}
          </IconBtn>
          {editingSectionId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-sm text-gray-600 underline"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* Render NestedView component if the course has content */}
      {course?.courseContent?.length > 0 && (
        <NestedView handleChangeEditSectionName={handleEditSection} />
      )}

      {/* Navigation buttons */}
      <div className="flex justify-end gap-2 mt-4">
        <button className="px-4 py-2 bg-gray-200 rounded">Back</button>
        <IconBtn text="Next" className="px-4 py-2 bg-blue-500 text-white" />
      </div>
    </div>
  );
};

export default CourseBuilderForm2;
