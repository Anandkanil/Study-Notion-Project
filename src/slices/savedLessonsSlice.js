import { createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";

import { apiConnector } from "../services/apiconnector";
import { profileEndpoints } from "../services/apis";

// Lessons the student bookmarked to rewatch. Loaded once after login.
const savedLessonsSlice = createSlice({
  name: "savedLessons",
  initialState: { list: [], loaded: false },
  reducers: {
    setSavedLessons(state, action) {
      state.list = action.payload || [];
      state.loaded = true;
    },
    clearSavedLessons(state) {
      state.list = [];
      state.loaded = false;
    },
  },
});

export const { setSavedLessons, clearSavedLessons } = savedLessonsSlice.actions;
export default savedLessonsSlice.reducer;

const auth = (token) => ({ Authorization: `Bearer ${token}` });

export const loadSavedLessons = (token) => async (dispatch) => {
  try {
    const res = await apiConnector("GET", profileEndpoints.SAVED_LESSONS_API, null, auth(token));
    dispatch(setSavedLessons(res.data?.data || []));
  } catch (error) {
    console.error("Saved lessons load:", error);
  }
};

/** Saves or removes a lesson; the bookmark changes straight away and rolls back on failure. */
export const toggleSavedLesson = ({ courseId, sectionId, subSectionId, title, courseName }, token) => async (dispatch, getState) => {
  const list = getState().savedLessons.list;
  const saved = list.some((l) => l.subSectionId === String(subSectionId));
  dispatch(
    setSavedLessons(
      saved
        ? list.filter((l) => l.subSectionId !== String(subSectionId))
        : [{ courseId, sectionId, subSectionId: String(subSectionId), title, courseName, at: new Date().toISOString() }, ...list]
    )
  );
  try {
    const res = saved
      ? await apiConnector("DELETE", `${profileEndpoints.SAVED_LESSONS_API}/${subSectionId}`, null, auth(token))
      : await apiConnector("POST", profileEndpoints.SAVED_LESSONS_API, { courseId, sectionId, subSectionId }, auth(token));
    dispatch(setSavedLessons(res.data?.data || []));
    toast.success(saved ? "Removed from saved lessons" : "Lesson saved. Find it under Saved lessons.", { id: `save-${subSectionId}` });
  } catch (error) {
    dispatch(setSavedLessons(list));
    toast.error(error.response?.data?.message || "Couldn't update your saved lessons. Please try again.", { id: `save-${subSectionId}` });
  }
};
