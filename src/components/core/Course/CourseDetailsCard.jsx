import React from "react";
import copy from "copy-to-clipboard";
import { toast } from "react-hot-toast";
import { BsFillCaretRightFill } from "react-icons/bs";
import { FaShareSquare } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { addToCart } from "../../../slices/cartSlice";
import { ACCOUNT_TYPE } from "../../../utils/constants";

function CourseDetailsCard({ course, setConfirmationModal, handleBuyCourse }) {
  const { user } = useSelector((state) => state.profile);
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { thumbnail: ThumbnailImage, price: CurrentPrice } = course;

  const handleShare = () => {
    copy(window.location.href);
    toast.success("Link copied to clipboard");
  };

  const handleAddToCart = () => {
    if (user?.accountType === ACCOUNT_TYPE.INSTRUCTOR) {
      toast.error("You are an Instructor. You can't buy a course.");
      return;
    }
    if (token) {
      dispatch(addToCart(course));
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
    user && course?.studentsEnrolled.some((student) => student._id === user._id);

  return (
    <div className="flex flex-col gap-4 rounded-md bg-richblack-700 p-4 text-richblack-5">
      {/* Course Image */}
      <img
        src={ThumbnailImage}
        alt={course?.courseName || "Course Thumbnail"}
        className="max-h-[300px] min-h-[180px] w-full rounded-2xl object-cover"
      />

      <div className="px-4">
        <div className="space-x-3 pb-4 text-3xl font-semibold">
          Rs. {CurrentPrice}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <button
            className="yellowButton w-full"
            onClick={isEnrolled ? () => navigate("/dashboard/enrolled-courses") : handleBuyCourse}
          >
            {isEnrolled ? "Go To Course" : "Buy Now"}
          </button>

          {!isEnrolled && (
            <button onClick={handleAddToCart} className="blackButton w-full">
              Add to Cart
            </button>
          )}
        </div>

        {/* Additional Information */}
        <p className="pb-3 pt-6 text-center text-sm text-richblack-25">
          30-Day Money-Back Guarantee
        </p>

        <div>
          <p className="my-2 text-xl font-semibold">This Course Includes:</p>
          <div className="flex flex-col gap-3 text-sm text-caribbeangreen-100">
            {course?.instructions?.map((item, i) => (
              <p className="flex gap-2" key={i}>
                <BsFillCaretRightFill />
                <span>{item}</span>
              </p>
            ))}
          </div>
        </div>

        {/* Share Button */}
        <div className="text-center">
          <button
            className="mx-auto flex items-center gap-2 py-6 text-yellow-100"
            onClick={handleShare}
          >
            <FaShareSquare size={15} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

export default CourseDetailsCard;
