import { toast } from "react-hot-toast"

// import { updateCompletedLectures } from "../../slices/viewCourseSlice"
// import { setLoading } from "../../slices/profileSlice";
import { apiConnector } from "../apiconnector"
import { courseEndpoints } from "../apis"

const {
  COURSE_DETAILS_API,
  COURSE_CATEGORIES_API,
  GET_ALL_COURSE_API,
  CREATE_COURSE_API,
  EDIT_COURSE_API,
  CREATE_SECTION_API,
  CREATE_SUBSECTION_API,
  UPDATE_SECTION_API,
  UPDATE_SUBSECTION_API,
  DELETE_SECTION_API,
  DELETE_SUBSECTION_API,
  GET_ALL_INSTRUCTOR_COURSES_API,
  DELETE_COURSE_API,
  GET_FULL_COURSE_DETAILS_AUTHENTICATED,
  CREATE_RATING_API,
  LECTURE_COMPLETION_API,
} = courseEndpoints

export const getAllCourses = async () => {
  let result = []
  try {
    const response = await apiConnector("GET", GET_ALL_COURSE_API)
    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Course Categories")
    }
    result = response?.data?.data?.allCategories
   
  } catch (error) {
    console.error("GET_ALL_COURSE_API API ERROR............", error)
    toast.error(error.response?.data?.message || "Courses couldn't load. Please try again.")
  }
  return result
}

export const fetchCourseDetails = async (courseId) => {
  //   dispatch(setLoading(true));
  let result = null
  try {
    const response = await apiConnector("POST", COURSE_DETAILS_API, {
      courseId,
    })

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
    result = response.data;
  } catch (error) {
    console.error("COURSE_DETAILS_API API ERROR............", error)
    result = error.response?.data || { success: false }
  }
  return result
}

// fetching the available course categories
export const fetchCourseCategories = async () => {
  let result = []
  try {
    const response = await apiConnector("GET", COURSE_CATEGORIES_API)
    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Course Categories")
    }
    result = response?.data?.data
  } catch (error) {
    console.error("COURSE_CATEGORY_API API ERROR............", error)
    toast.error(error.response?.data?.message || "Subjects couldn't load. Please try again.")
  }
  return result
}

// add the course details
export const addCourseDetails = async (data, token) => {
  let result = null
  const toastId = toast.loading("Saving course details…")
  try {
    const response = await apiConnector("POST", CREATE_COURSE_API, data, {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Add Course Details")
    }
    toast.success("Course saved as a draft. Next, add lessons.")
    result = response?.data?.data
  } catch (error) {
    console.error("CREATE COURSE API ERROR............", error)
    toast.error(error.response?.data?.message || "Course couldn't be saved. Please try again.")
  }
  toast.dismiss(toastId)
  return result
}

// edit the course details
export const editCourseDetails = async (data, token, successMessage = "Changes saved") => {
  let result = null
  const toastId = toast.loading("Saving changes…")
  try {
    const response = await apiConnector("POST", EDIT_COURSE_API, data, {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Update Course Details")
    }
    toast.success(successMessage)
    result = response?.data?.data
  } catch (error) {
    console.error("EDIT COURSE API ERROR............", error)
    toast.error(error.response?.data?.message || "Changes couldn't be saved. Please try again.")
  }
  toast.dismiss(toastId)
  return result
}

// create a section
export const createSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Adding section…")
  try {
    const response = await apiConnector("POST", CREATE_SECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Create Section")
    }
    toast.success("Section added")
    result = response?.data?.updatedCourse
  } catch (error) {
    console.error("CREATE SECTION API ERROR............", error)
    toast.error(error.response?.data?.message || "Section couldn't be added. Please try again.")
  }
  toast.dismiss(toastId)
  return result
}

// create a subsection
export const createSubSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Uploading lesson video…")
  try {
    const response = await apiConnector("POST", CREATE_SUBSECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Add Lecture")
    }
    toast.success("Lesson added")
    result = response?.data?.data
  } catch (error) {
    console.error("CREATE SUB-SECTION API ERROR............", error)
    toast.error(error.response?.data?.message || "Lesson couldn't be added. Please try again.")
  }
  toast.dismiss(toastId)
  return result
}

// update a section
export const updateSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Renaming section…")
  try {
    const response = await apiConnector("POST", UPDATE_SECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Update Section")
    }
    toast.success("Section renamed")
    result = response?.data?.data
  } catch (error) {
    console.error("UPDATE SECTION API ERROR............", error)
    toast.error(error.response?.data?.message || "Section couldn't be renamed. Please try again.")
  }
  toast.dismiss(toastId)
  return result
}

// update a subsection
export const updateSubSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Saving lesson…")
  try {
    const response = await apiConnector("POST", UPDATE_SUBSECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Update Lecture")
    }
    toast.success("Lesson updated")
    result = response?.data?.data
  } catch (error) {
    console.error("UPDATE SUB-SECTION API ERROR............", error)
    toast.error(error.response?.data?.message || "Lesson couldn't be updated. Please try again.")
  }
  toast.dismiss(toastId)
  return result
}

// delete a section
export const deleteSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Deleting section…")
  try {
    const response = await apiConnector("POST", DELETE_SECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Delete Section")
    }
    toast.success("Section deleted")
    result = response?.data?.data
  } catch (error) {
    console.error("DELETE SECTION API ERROR............", error)
    toast.error(error.response?.data?.message || "Section couldn't be deleted. Please try again.")
  }
  toast.dismiss(toastId)
  return result
}
// delete a subsection
export const deleteSubSection = async (data, token) => {
  let result = null
  const toastId = toast.loading("Deleting lesson…")
  try {
    const response = await apiConnector("POST", DELETE_SUBSECTION_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Delete Lecture")
    }
    toast.success("Lesson deleted")
    result = response?.data?.data
  } catch (error) {
    console.error("DELETE SUB-SECTION API ERROR............", error)
    toast.error(error.response?.data?.message || "Lesson couldn't be deleted. Please try again.")
  }
  toast.dismiss(toastId)
  return result
}

// fetching all courses under a specific instructor
export const fetchInstructorCourses = async (token) => {
  let result = []
  try {
    const response = await apiConnector(
      "GET",
      GET_ALL_INSTRUCTOR_COURSES_API,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    )
    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Instructor Courses")
    }
    result = response?.data?.data
  } catch (error) {
    console.error("INSTRUCTOR COURSES API ERROR............", error)
    toast.error(error.response?.data?.message || "Your courses couldn't load. Please try again.")
  }
  return result
}

// delete a course
export const deleteCourse = async (data, token) => {
  const toastId = toast.loading("Deleting course…")
  try {
    const response = await apiConnector("DELETE", DELETE_COURSE_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) {
      throw new Error("Could Not Delete Course")
    }
    toast.success("Course deleted")
  } catch (error) {
    console.error("DELETE COURSE API ERROR............", error)
    toast.error(error.response?.data?.message || "Course couldn't be deleted. Please try again.")
  }
  toast.dismiss(toastId)
}

// get full details of a course
export const getFullDetailsOfCourse = async (courseId, token) => {
  //   dispatch(setLoading(true));
  let result = null
  try {
    const response = await apiConnector(
      "POST",
      GET_FULL_COURSE_DETAILS_AUTHENTICATED,
      {
        courseId,
      },
      {
        Authorization: `Bearer ${token}`,
      }
    )

    if (!response.data.success) {
      throw new Error(response.data.message)
    }
    result = response?.data?.data
  } catch (error) {
    console.error("COURSE_FULL_DETAILS_API API ERROR............", error)
    result = error.response.data
    // toast.error(error.response.data.message);
  }
  //   dispatch(setLoading(false));
  return result
}

// mark a lecture as complete
export const markLectureAsComplete = async (data, token) => {
  let result = null
  try {
    const response = await apiConnector("POST", LECTURE_COMPLETION_API, data, {
      Authorization: `Bearer ${token}`,
    })

    if (!response.data.message) {
      throw new Error(response.data.error)
    }
    // Truthy either way; carries the streak update when the server sends one
    result = response.data
  } catch (error) {
    console.error("MARK_LECTURE_AS_COMPLETE_API API ERROR............", error)
    toast.error(error.response?.data?.message || "Couldn't save your progress. Please try again.")
    result = false
  }
  return result
}

// create a rating for course
export const createRating = async (data, token) => {
  const toastId = toast.loading("Posting your review…")
  try {
    const response = await apiConnector("POST", CREATE_RATING_API, data, {
      Authorization: `Bearer ${token}`,
    })
    if (!response?.data?.success) throw new Error("Review not saved")
    toast.success("Thanks! Your review is posted.", { id: toastId })
    return true
  } catch (error) {
    toast.error(error.response?.data?.message || "Your review couldn't be posted. Please try again.", { id: toastId })
    return false
  }
}