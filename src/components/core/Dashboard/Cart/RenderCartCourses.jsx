import React from "react";
import { useDispatch, useSelector } from "react-redux";
import ReactStars from "react-rating-stars-component";
import { FaRegStar, FaStar } from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { removeFromCart } from "../../../../slices/cartSlice";

const RenderCartCourses = () => {
  // Access cart state from Redux store
  const { cart } = useSelector((state) => state.cart);

  // Dispatch function to handle actions
  const dispatch = useDispatch();

  return (
    <div className="cart-courses-container">
      {/* Check if cart has any courses */}
      {cart.length > 0 ? (
        cart.map((course, index) => (
          <div
            key={course._id}
            className="course-item flex justify-between items-center border-b border-gray-700 pb-4 mb-4"
          >
            {/* Left Section: Thumbnail and Details */}
            <div className="flex items-start gap-4">
              {/* Course Thumbnail */}
              <img
                src={course.thumbnail}
                alt={`${course.courseName} thumbnail`}
                className="w-24 h-16 object-cover rounded-md"
              />

              {/* Course Details */}
              <div className="flex flex-col">
                {/* Course Name */}
                <p className="text-lg font-semibold">{course.courseName}</p>

                {/* Course Category */}
                <p className="text-sm text-gray-400">{course?.category?.name}</p>

                {/* Course Ratings */}
                <div className="flex items-center gap-2 mt-2">
                  {/* Rating Score */}
                  <span className="text-yellow-500 font-bold">4.8</span>

                  {/* Star Ratings */}
                  <ReactStars
                    count={5}
                    size={20}
                    edit={false}
                    value={4.8} // Hardcoded rating; update dynamically if required
                    activeColor={"#ffd700"}
                    emptyIcon={<FaRegStar />}
                    fullIcon={<FaStar />}
                  />

                  {/* Total Ratings */}
                  <span className="text-sm text-gray-400">
                    ({course?.ratingAndReviews?.length} Ratings)
                  </span>
                </div>
              </div>
            </div>

            {/* Right Section: Remove Button and Price */}
            <div className="flex flex-col items-end">
              {/* Remove Button */}
              <button
                className="flex items-center gap-2 text-red-500 hover:text-red-700"
                onClick={() => dispatch(removeFromCart(course._id))}
              >
                <RiDeleteBin6Line size={20} />
                <span className="text-sm">Remove</span>
              </button>

              {/* Course Price */}
              <p className="text-lg font-bold text-gray-200">
                ₹{course?.price.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        ))
      ) : (
        // Message when cart is empty
        <p className="text-gray-400 text-center">Your cart is empty.</p>
      )}
    </div>
  );
};

export default RenderCartCourses;
