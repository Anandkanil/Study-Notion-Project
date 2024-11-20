import React, { useState } from "react";
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../../services/operations/authAPI";
import { useDispatch } from "react-redux";

export default function LoginForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State for form data
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // State to toggle password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Handler to update form data on input change
  function changeHandler(e) {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  }

  // Handler for form submission
  function submitHandler(e) {
    e.preventDefault();

    if (formData.email.trim() && formData.password.trim()) {
      dispatch(login(formData.email, formData.password, navigate));
    }
  }

  return (
    <form onSubmit={submitHandler} className="w-full flex flex-col gap-y-4 mt-6">
      {/* Email Input */}
      <label className="w-full flex flex-col gap-1">
        <p className="text-[0.875rem] leading-[1.375rem] text-richblack-5 mb-1">
          Email Address<span className="text-pink-200"> *</span>
        </p>
        <input
          className="p-[12px] bg-richblack-800 rounded-[0.5rem] text-richblack-5 w-full"
          name="email"
          value={formData.email}
          onChange={changeHandler}
          type="email"
          placeholder="Enter email address"
          required
        />
      </label>

      {/* Password Input */}
      <label className="relative flex flex-col gap-1">
        <p className="text-[0.875rem] leading-[1.375rem] text-richblack-5 mb-1">
          Password<span className="text-pink-200"> *</span>
        </p>
        <input
          name="password"
          className="p-[12px] bg-richblack-800 rounded-[0.5rem] text-richblack-5 w-full"
          value={formData.password}
          onChange={changeHandler}
          type={showPassword ? "text" : "password"}
          placeholder="Enter password"
          required
        />
        {/* Toggle Password Visibility */}
        <span
          className="absolute right-3 top-[38px] z-[10] cursor-pointer"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <AiOutlineEyeInvisible color="white" fontSize="24" />
          ) : (
            <AiOutlineEye color="white" fontSize="24" />
          )}
        </span>
        {/* Forgot Password Link */}
        <Link to="/forgot-password">
          <p className="text-xs mt-1 text-blue-100 max-w-max ml-auto">
            Forgot Password?
          </p>
        </Link>
      </label>

      {/* Submit Button */}
      <button
        className="bg-yellow-50 font-semibold py-[8px] px-[12px] rounded-[8px] mt-6 text-richblack-900"
        type="submit"
      >
        Sign In
      </button>
    </form>
  );
}
