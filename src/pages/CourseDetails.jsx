import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { buyCourse } from '../services/operations/studentFeaturesAPI';
import { fetchCourseDetails } from '../services/operations/courseDetailsAPI';
import GetAvgRating from '../utils/avgRating';
import ConfirmationModal from '../components/common/ConfirmationModal'
import { BiInfoCircle } from 'react-icons/bi';
import { formatDate } from "../services/formatDate"
import { HiOutlineGlobeAlt } from 'react-icons/hi';
import Footer from "../components/common/Footer"
import RatingStars from "../components/common/RatingStars"
import CourseDetailsCard from '../components/core/Course/CourseDetailsCard'
import CourseAccordionBar from '../components/core/Course/CourseAccordionBar';
import toast from 'react-hot-toast';
import { ACCOUNT_TYPE } from '../utils/constants';
import { addToCart } from '../slices/cartSlice';

const CourseDetails = () => {
  // Redux store values
  const { token } = useSelector((state) => state.auth);
  const { user } = useSelector((state) => state.profile);

  // Hooks
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { courseId } = useParams();

  // Local state
  const { paymentLoading } = useSelector((state) => state.course)
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avgReviewRating, setAvgReviewRating] = useState(0);
  const [totalNoOfLectures,setTotalNoOfLectures]=useState(0);
  const [confirmationModal,setConfirmationModal]=useState(null);

  // Fetch course details
  useEffect(() => {
    const fetchCourseData = async () => {
      setLoading(true);
      try {
        const result = await fetchCourseDetails(courseId);
        // console.log("The result is",result)
  
        // Set course data
        setCourseData(result.data);
          
        // Calculate average rating
        if (result.data.courseDetails.ratingAndReviews) {
          const avgRating = GetAvgRating(result.data.courseDetails.ratingAndReviews);
          setAvgReviewRating(avgRating);
        }
  
        // Calculate total number of lectures
        const totalLectures = result?.data?.courseDetails?.courseContent?.reduce(
          (acc, section) => acc + (section.subSection?.length || 0),
          0
        );
        setTotalNoOfLectures(totalLectures || 0);
      } catch (error) {
        setError('Failed to fetch course details.');
        console.error('Error fetching course details:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCourseData();
  }, [courseId]);
  

  // Handle course purchase
  const handleBuyCourse = async () => {
    if (!token) {
      setConfirmationModal({
        text1:"You're not Logged In",
        text2:"Please Login to purchase the Course",
        btn1Text:"Login",
        btn2Text:"Cancel",
        btn1Handler:()=>navigate('/login'),
        btn2Handler:()=>setConfirmationModal(null),
      })
      console.error('User is not authenticated.');
      return;
    }
    try {
      await buyCourse(token, [courseId], user, navigate, dispatch);
    } catch (error) {
      console.error('Error buying course:', error);
    }
  };


  // const [collapse, setCollapse] = useState("")
  const [isActive, setIsActive] = useState(Array(0))
  const handleActive = (id) => {
    // console.log("called", id)
    setIsActive(
      !isActive.includes(id)
        ? isActive.concat([id])
        : isActive.filter((e) => e != id)
    )
  }

  // Render loading state
  if (loading) {
    return <div>Loading course details...</div>;
  }

  // Render error state
  if (error) {
    return <div>{error}</div>;
  }

  const {
    _id: course_id,
    courseName,
    courseDescription,
    thumbnail,
    price,
    whatYouWillLearn,
    courseContent,
    ratingAndReviews,
    instructor,
    studentsEnrolled,
    createdAt,
  }=courseData.courseDetails;

  const handleAddToCart = () => {
    if (user?.accountType === ACCOUNT_TYPE.INSTRUCTOR) {
      toast.error("You are an Instructor. You can't buy a course.");
      return;
    }
    if (token) {
      dispatch(addToCart(courseData.courseDetails));
      return;
    }
    setConfirmationModal({
      text1: "You are not logged in!",
      text2: "Please login to add to the cart.",
      btn1Text: "Login",
      btn2Text: "Cancel",
      btn1Handler: () => navigate("/login"),
      btn2Handler: () => setConfirmationModal(null),
    });
  };

  const isEnrolled =
    user && studentsEnrolled.some((student) => student._id === user._id);

  // Render course details
  return (
    <>
      <div>
      <div className={`relative w-full bg-richblack-800`} >
        {/* Hero Section */}
        <div className="mx-auto box-content px-4 lg:w-[1260px] 2xl:relative ">
          <div className="mx-auto grid min-h-[450px] max-w-maxContentTab justify-items-center py-8 lg:mx-0 lg:justify-items-start lg:py-0 xl:max-w-[810px]">
            <div className="relative block max-h-[30rem] lg:hidden">
              <div className="absolute bottom-0 left-0 h-full w-full shadow-[#161D29_0px_-64px_36px_-28px_inset]"></div>
              <img
                src={thumbnail}
                alt="course thumbnail"
                className="aspect-auto w-full"
              />
            </div>
            <div
              className={`z-30 my-5 flex flex-col justify-center gap-4 py-5 text-lg text-richblack-5`}
            >
              <div>
                <p className="text-4xl font-bold text-richblack-5 sm:text-[42px]">
                  {courseName}
                </p>
              </div>
              <p className={`text-richblack-200`}>{courseDescription}</p>
              <div className="text-md flex flex-wrap items-center gap-2">
                <span className="text-yellow-25">{avgReviewRating}</span>
                <RatingStars Review_Count={avgReviewRating} Star_Size={24} />
                <span>{`(${ratingAndReviews.length} reviews)`}</span>
                <span>{`${studentsEnrolled.length} students enrolled`}</span>
              </div>
              <div>
                <p className="">
                  Created By {`${instructor.firstName} ${instructor.lastName}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-5 text-lg">
                <p className="flex items-center gap-2">
                  {" "}
                  <BiInfoCircle /> Created at {formatDate(createdAt)}
                </p>
                <p className="flex items-center gap-2">
                  {" "}
                  <HiOutlineGlobeAlt /> English
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-4 border-y border-y-richblack-500 py-4 lg:hidden">
              <p className="space-x-3 pb-4 text-3xl font-semibold text-richblack-5">
                Rs. {price}
              </p>
              <button className="yellowButton" onClick={studentsEnrolled.some((student)=>student._id===user._id)?() => navigate("/dashboard/enrolled-courses"):handleBuyCourse}>
                {/* Buy Now */}
                {
                  studentsEnrolled.some((student)=>student._id===user._id)?"Go to Course":"Buy Now"
                }
              </button>
              {!isEnrolled && (
            <button onClick={handleAddToCart} className="blackButton w-full">
              Add to Cart
            </button>
          )}
            </div>
          </div>
          {/* Courses Card */}
          <div className="right-[1rem] top-[60px] mx-auto hidden min-h-[600px] w-1/3 max-w-[410px] translate-y-24 md:translate-y-0 lg:absolute lg:block">
            <CourseDetailsCard
              course={courseData?.courseDetails}
              setConfirmationModal={setConfirmationModal}
              handleBuyCourse={handleBuyCourse}
            />
          </div>
        </div>
      </div>
      <div className="mx-auto box-content px-4 text-start text-richblack-5 lg:w-[1260px]">
        <div className="mx-auto max-w-maxContentTab lg:mx-0 xl:max-w-[810px]">
          {/* What will you learn section */}
          <div className="my-8 border border-richblack-600 p-8">
            <p className="text-3xl font-semibold">What you'll learn</p>
            <div className="mt-5">
              {/* <ReactMarkdown>{whatYouWillLearn}</ReactMarkdown> */}
            </div>
          </div>

          {/* Course Content Section */}
          <div className="max-w-[830px] ">
            <div className="flex flex-col gap-3">
              <p className="text-[28px] font-semibold">Course Content</p>
              <div className="flex flex-wrap justify-between gap-2">
                <div className="flex gap-2">
                  <span>
                    {courseContent.length} {`section(s)`}
                  </span>
                  <span>
                    {totalNoOfLectures} {`lecture(s)`}
                  </span>
                  <span>{courseData?.totalDuration} total length</span>
                </div>
                <div>
                  <button
                    className="text-yellow-25"
                    onClick={() => setIsActive([])}
                  >
                    Collapse all sections
                  </button>
                </div>
              </div>
            </div>

            {/* Course Details Accordion */}
            <div className="py-4">
            {/* <CourseAccordionBar
                  course={course}
                  key={index}
                  isActive={isActive}
                  handleActive={handleActive}
                /> */}
              {courseContent?.map((course, index) => (
                <CourseAccordionBar
                  course={course}
                  key={index}
                  isActive={isActive}
                  handleActive={handleActive}
                />
                
              ))}
            </div>

            {/* Author Details */}
            <div className="mb-12 py-4">
              <p className="text-[28px] font-semibold">Author</p>
              <div className="flex items-center gap-4 py-4">
                <img
                  src={
                    instructor.image
                      ? instructor.image
                      : `https://api.dicebear.com/5.x/initials/svg?seed=${instructor.firstName} ${instructor.lastName}`
                  }
                  alt="Author"
                  className="h-14 w-14 rounded-full object-cover"
                />
                <p className="text-lg">{`${instructor.firstName} ${instructor.lastName}`}</p>
              </div>
              <p className="text-richblack-50">
                {instructor?.additionalDetails?.about}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
      </div>
    </>
  )
};

export default CourseDetails;
