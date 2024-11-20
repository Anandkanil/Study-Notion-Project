import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getPasswordResetToken } from '../services/operations/authAPI';
import toast from 'react-hot-toast';
import { IoArrowBack } from 'react-icons/io5';

const ForgotPassword = () => {
    const { loading } = useSelector((state) => state.auth);
    const [emailSent, setEmailSent] = useState(false);
    const [email, setEmail] = useState("");
    const dispatch = useDispatch();

    const handleOnSubmit = (e) => {
        e.preventDefault();
        dispatch(getPasswordResetToken(email, setEmailSent));
    };

    return (
        <div className="w-full min-h-screen flex justify-center items-center bg-gray-800 py-6">
            {
                loading ? (
                    <div className="text-white font-bold text-xl">Loading...</div>
                ) : (
                    <div className="w-full max-w-md p-8 bg-richblack-800 rounded-xl shadow-lg">
                        <h1 className="text-richblack-5 text-3xl font-semibold mb-6">
                            { !emailSent ? "Reset your Password" : "Check Your Email" }
                        </h1>

                        <p className="text-richblack-5 mb-6">
                            {
                                !emailSent ? 
                                "Have no fear. We'll email you instructions to reset your password. If you don't have access to your email, we can try account recovery." :
                                `We have sent the reset email to ${email}`
                            }
                        </p>

                        <form onSubmit={handleOnSubmit} className="flex flex-col gap-6 font-inter text-white">
                            {
                                !emailSent && (
                                    <label className="text-sm font-medium">
                                        <p>Email Address <span className='text-red'>*</span></p>
                                        <input
                                            required
                                            type="email"
                                            name="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter Your Email Address"
                                            className="p-3 px-6 bg-richblack-700 border-b mt-3 border-b-richblack-500 rounded-md text-white font-semibold shadow-sm w-full placeholder:text-gray-400 focus:ring-2 focus:ring-yellow-500"
                                        />
                                    </label>
                                )
                            }

                            <button
                                type="submit"
                                className="bg-yellow-50 mt-4 py-3 px-8 rounded-[8px] font-bold text-richblack-900 shadow-md hover:bg-yellow-300 transition"
                            >
                                { !emailSent ? "Reset Password" : "Resend Email" }
                            </button>
                        </form>

                        <div className="flex justify-between items-center mt-6">
                            <Link to="/login" className="text-white flex gap-2 items-center">
                            <IoArrowBack />
                                <p>Back to Login</p>
                            </Link>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default ForgotPassword;
