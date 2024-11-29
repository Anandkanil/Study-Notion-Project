import { useEffect, useState, useCallback } from "react"
import ProgressBar from "@ramonak/react-progress-bar"
import { BiDotsVerticalRounded } from "react-icons/bi"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { getUserEnrolledCourses } from "../../../services/operations/profileApi"

export default function EnrolledCourses() {
  const { token } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  const [enrolledCourses, setEnrolledCourses] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Optimized function to fetch enrolled courses with error handling
  const getEnrolledCourses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getUserEnrolledCourses(token)
      setEnrolledCourses(res)
    } catch (error) {
      console.log("Error fetching enrolled courses:", error)
      setError("Could not fetch enrolled courses. Please try again later.")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    getEnrolledCourses()
  }, [getEnrolledCourses])

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-3.5rem)] place-items-center">
        <div className="spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  if (!enrolledCourses?.length) {
    return (
      <p className="grid h-[10vh] w-full place-content-center text-richblack-5">
        You have not enrolled in any course yet.
      </p>
    )
  }

  return (
    <>
      <div className="text-3xl text-richblack-50">Enrolled Courses</div>
      <div className="my-8 text-richblack-5">
        {/* Headings */}
        <div className="flex rounded-t-lg bg-richblack-500 ">
          <p className="w-[45%] px-5 py-3">Course Name</p>
          <p className="w-1/4 px-2 py-3">Duration</p>
          <p className="flex-1 px-2 py-3">Progress</p>
        </div>

        {/* Course Names */}
        {enrolledCourses.map((course, i, arr) => (
          <div
            className={`flex items-center border border-richblack-700 ${
              i === arr.length - 1 ? "rounded-b-lg" : "rounded-none"
            }`}
            key={course._id}
          >
            <div
              className="flex w-[45%] cursor-pointer items-center gap-4 px-5 py-3"
              onClick={() => {
                navigate(
                  `/view-course/${course?._id}/section/${course.courseContent?.[0]?._id}/sub-section/${course.courseContent?.[0]?.subSection?.[0]?._id}`
                )
              }}
            >
              <img
                src={course.thumbnail || "fallback-image-url"} // Add fallback image URL
                alt="course_img"
                className="h-14 w-14 rounded-lg object-cover"
              />
              <div className="flex max-w-xs flex-col gap-2">
                <p className="font-semibold">{course.courseName}</p>
                <p className="text-xs text-richblack-300">
                  {course.courseDescription.length > 50
                    ? `${course.courseDescription.slice(0, 50)}...`
                    : course.courseDescription}
                </p>
              </div>
            </div>
            <div className="w-1/4 px-2 py-3">{course?.totalDuration}</div>
            <div className="flex w-1/5 flex-col gap-2 px-2 py-3">
              <p>Progress: {course.progressPercentage || 0}%</p>
              <ProgressBar
                completed={course.progressPercentage || 0}
                height="8px"
                isLabelVisible={false}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
