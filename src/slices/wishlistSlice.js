import { createSlice } from "@reduxjs/toolkit";
import toast from "react-hot-toast";

import { apiConnector } from "../services/apiconnector";
import { profileEndpoints } from "../services/apis";

// Ids of courses the student saved for later. Loaded once after login.
const wishlistSlice = createSlice({
  name: "wishlist",
  initialState: { ids: [], loaded: false },
  reducers: {
    setWishlistIds(state, action) {
      state.ids = action.payload.map(String);
      state.loaded = true;
    },
    clearWishlist(state) {
      state.ids = [];
      state.loaded = false;
    },
  },
});

export const { setWishlistIds, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;

const auth = (token) => ({ Authorization: `Bearer ${token}` });

export const loadWishlist = (token) => async (dispatch) => {
  try {
    const res = await apiConnector("GET", profileEndpoints.WISHLIST_API, null, auth(token));
    dispatch(setWishlistIds((res.data?.data || []).map((c) => c._id)));
  } catch (error) {
    console.error("Wishlist load:", error);
  }
};

/** Saves or removes a course; the heart changes straight away and rolls back on failure. */
export const toggleWishlist = (courseId, token) => async (dispatch, getState) => {
  const ids = getState().wishlist.ids;
  const saved = ids.includes(String(courseId));
  dispatch(setWishlistIds(saved ? ids.filter((id) => id !== String(courseId)) : [...ids, String(courseId)]));
  try {
    const res = saved
      ? await apiConnector("DELETE", `${profileEndpoints.WISHLIST_API}/${courseId}`, null, auth(token))
      : await apiConnector("POST", profileEndpoints.WISHLIST_API, { courseId }, auth(token));
    dispatch(setWishlistIds(res.data?.data || []));
    toast.success(saved ? "Removed from your wishlist" : "Saved to your wishlist", { id: `wish-${courseId}` });
  } catch (error) {
    dispatch(setWishlistIds(ids));
    toast.error(error.response?.data?.message || "Your wishlist couldn't be updated. Please try again.", { id: `wish-${courseId}` });
  }
};
