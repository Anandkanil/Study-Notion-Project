import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import CountryCode from "../../data/countrycode.json";
import { apiConnector } from "../../services/apiconnector";
import { contactusEndpoint } from "../../services/apis";

const ContactUsForm = () => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful },
  } = useForm();

  const submitContactForm = async (data) => {
    try {
      setLoading(true);
      const res = await apiConnector(
        "POST",
        contactusEndpoint.CONTACT_US_API,
        data
      );
      console.log("Form submitted successfully:", res);
      setLoading(false);
    } catch (error) {
      console.error("Error submitting form:", error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSubmitSuccessful) {
      reset({
        email: "",
        firstname: "",
        lastname: "",
        message: "",
        phoneNo: "",
      });
    }
  }, [reset, isSubmitSuccessful]);

  return (
    <div className="flex items-center justify-center bg-richblack-900">
      <div className="w-full max-w-lg p-8  rounded-lg shadow-md">
        <form
          className="space-y-6"
          onSubmit={handleSubmit(submitContactForm)}
        >
          {/* First and Last Name */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="firstname" className="block text-sm text-richblack-300 mb-2">
                First Name
              </label>
              <input
                type="text"
                id="firstname"
                placeholder="Enter first name"
                className="w-full p-3 rounded-lg bg-richblack-700 text-white placeholder-gray-400"
                {...register("firstname", { required: "First name is required." })}
              />
              {errors.firstname && (
                <span className="text-red text-xs mt-1">{errors.firstname.message}</span>
              )}
            </div>
            <div className="flex-1">
              <label htmlFor="lastname" className="block text-sm text-richblack-300 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="lastname"
                placeholder="Enter last name"
                className="w-full p-3 rounded-lg bg-richblack-700 text-white placeholder-gray-400"
                {...register("lastname")}
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-sm text-richblack-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              placeholder="Enter email address"
              className="w-full p-3 rounded-lg bg-richblack-700 text-white placeholder-gray-400"
              {...register("email", { required: "Email is required." })}
            />
            {errors.email && (
              <span className="text-red text-xs mt-1">{errors.email.message}</span>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phonenumber" className="block text-sm text-richblack-300 mb-2">
              Phone Number
            </label>
            <div className="flex gap-4">
              <div className="w-[90px]">
                <select
                  className="w-full p-3 rounded-lg bg-richblack-700 text-white"
                  {...register("countrycode", { required: "Country code is required." })}
                >
                  {CountryCode.map((ele, i) => (
                    <option key={i} value={ele.code}>
                      {ele.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  id="phonenumber"
                  placeholder="12345 67890"
                  className="w-full p-3 rounded-lg bg-richblack-700 text-white placeholder-gray-400"
                  {...register("phoneNo", {
                    required: "Phone number is required.",
                    minLength: { value: 10, message: "Invalid phone number." },
                    maxLength: { value: 12, message: "Invalid phone number." },
                  })}
                />
                {errors.phoneNo && (
                  <span className="text-red text-xs mt-1">{errors.phoneNo.message}</span>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm text-richblack-300 mb-2">
              Message
            </label>
            <textarea
              id="message"
              rows="4"
              placeholder="Enter your message"
              className="w-full p-3 rounded-lg bg-richblack-700 text-white placeholder-gray-400"
              {...register("message", { required: "Message is required." })}
            />
            {errors.message && (
              <span className="text-red text-xs mt-1">{errors.message.message}</span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-3 bg-yellow-50 text-richblack-900 font-bold rounded-lg ${
              loading ? "opacity-50" : "hover:scale-95 hover:shadow-none"
            }`}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactUsForm;
