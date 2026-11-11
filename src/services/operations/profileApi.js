import { toast } from "react-hot-toast"

import { setLoading, setUser } from "../../slices/profileSlice"
import { apiConnector } from "../apiconnector"
import { profileEndpoints } from "../apis"
import { logout } from "./authAPI"

const { GET_USER_DETAILS_API, GET_USER_ENROLLED_COURSES_API,GET_INSTRUCTOR_DATA_API } = profileEndpoints

export function getUserDetails(token, navigate) {
  return async (dispatch) => {
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("GET", GET_USER_DETAILS_API)

      if (!response.data.success) {
        throw new Error(response.data.message)
      }
      const userImage = response.data.data.image
        ? response.data.data.image
        : `https://api.dicebear.com/5.x/initials/svg?seed=${response.data.data.firstName} ${response.data.data.lastName}`
      dispatch(setUser({ ...response.data.data, image: userImage }))
    } catch (error) {
      dispatch(logout(navigate))
      console.error("GET_USER_DETAILS API ERROR............", error)
      toast.error("Your profile couldn't load. Refresh the page to try again.")
    }
    dispatch(setLoading(false))
  }
}

export async function getUserEnrolledCourses(token) {
  let result = []
  try {
    const response = await apiConnector(
      "GET",
      GET_USER_ENROLLED_COURSES_API,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
    result = response.data.data
  } catch (error) {
    console.error("GET_USER_ENROLLED_COURSES_API API ERROR............", error)
    toast.error(error.response?.data?.message || "Could Not Get Enrolled Courses")
  }
  return result
}

export async function getInstructorData(token) {
  let instructorCourses = [];
  
  try {
    const response = await apiConnector("GET", GET_INSTRUCTOR_DATA_API, null, {
      Authorization: `Bearer ${token}`,
    });
    if (response?.data) {
      instructorCourses = response?.data?.courses ;
    } else {
      throw new Error(response?.data?.message || "Failed to fetch instructor data.");
    }
  } catch (error) {
    console.error("GET_INSTRUCTOR_DATA_API Error:", error);
    toast.error(error.response?.data?.message || "Could not get instructor data.");
  } finally {
  }

  return instructorCourses;
}

