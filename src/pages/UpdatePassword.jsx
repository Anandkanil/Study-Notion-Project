import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { resetPassword } from '../services/operations/authAPI';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import { IoArrowBack } from 'react-icons/io5';

const UpdatePassword = () => {

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { loading } = useSelector((state) => state.auth.loading);
    const { token } = useParams();
    const decodedToken = decodeURIComponent(token);

    const dispatch = useDispatch();
    const navigate=useNavigate();

    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    });

    function handleOnChange(e) {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    }

    function handleOnSubmit(e) {
        e.preventDefault();
        dispatch(resetPassword(formData.password, formData.confirmPassword, decodedToken, navigate));
    }

    return (
        <div className="w-full min-h-[90vh] flex flex-col items-center justify-center mt-6">
            <div className="w-full max-w-md p-6 bg-richblack-800 rounded-[0.5rem] shadow-md">
                {
                    loading ? (
                        <div>Loading...</div>
                    ) : (
                        <form onSubmit={handleOnSubmit} className="flex flex-col gap-y-4 font-inter text-white">
                            <h1 className="text-richblack-5 text-2xl font-semibold mb-4">Choose a New Password</h1>
                            <p className="text-richblack-5 mb-4">Almost done. Enter your new password and you're all set.</p>

                            {/* Input for New Password */}
                            <label className="flex flex-col mb-4">
                                <p className="text-richblack-5 mb-2">New Password  <span className='text-red'>*</span></p>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="******"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleOnChange}
                                    className="p-[12px] px-6 bg-richblack-700 border-b border-b-richblack-500 rounded-[0.5rem] text-white font-bold shadow-sm placeholder:text-gray-400"
                                />
                                <span
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-white cursor-pointer absolute top-16 right-6"
                                >
                                    {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
                                </span>
                            </label>

                            {/* Input for Confirm New Password */}
                            <label className="flex flex-col mb-4">
                                <p className="text-richblack-5 mb-2">Confirm New Password <span className='text-red'>*</span></p>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    placeholder="******"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleOnChange}
                                    className="p-[12px] px-6 bg-richblack-700 border-b border-b-richblack-500 rounded-[0.5rem] text-white font-bold shadow-sm placeholder:text-gray-400"
                                />
                                <span
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="text-white cursor-pointer absolute top-16 right-6"
                                >
                                    {showConfirmPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
                                </span>
                            </label>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="bg-yellow-50 py-[8px] px-[12px] rounded-[8px] font-bold text-richblack-900"
                                disabled={loading}
                            >
                                Reset Password
                            </button>
                        </form>
                    )
                }
                <div className="flex justify-between items-baseline mt-4">
                    <Link to="/login" className="text-white mb-2 flex gap-1 items-center">
                    <IoArrowBack />
                        <p>Back to Login</p>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default UpdatePassword;
