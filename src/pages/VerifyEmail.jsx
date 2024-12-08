import React, { useEffect, useState } from 'react';
import OTPInput from 'react-otp-input';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { sendOtp, signUp } from '../services/operations/authAPI';
import { IoArrowBack } from 'react-icons/io5';
import { GiBackwardTime } from 'react-icons/gi';

const VerifyEmail = () => {
    const [otp, setOtp] = useState('');
    const navigate = useNavigate();
    const { signupData = {}, loading } = useSelector((state) => state.auth);

    useEffect(() => {
        if (!signupData) {
            navigate('/signup');
        }
    }, [signupData, navigate]);

    const { firstName, lastName, email, password, confirmPassword, accountType } = signupData;

    const dispatch = useDispatch();

    const handleOnSubmit = (e) => {
        e.preventDefault();
        dispatch(
            signUp(firstName, lastName, email, password, confirmPassword, accountType, otp, navigate)
        );
    };

    const handleResendOTP = () => {
        dispatch(sendOtp(email, navigate));
    };

    return (
        <div className="w-full min-h-[90vh] flex flex-col items-center justify-center mt-6">
            <div className="w-full max-w-md p-6 bg-richblack-800 rounded-[0.5rem] shadow-md">
                <h1 className="text-richblack-5 text-2xl font-semibold mb-4">Verify Email</h1>
                <p className="text-richblack-5 mb-4">
                    A verification code has been sent to your email. Enter the code below to verify your account.
                </p>

                <form onSubmit={handleOnSubmit} className="flex flex-col gap-y-4 font-inter text-white">
                    <OTPInput
                        value={otp}
                        onChange={setOtp}
                        numInputs={6}
                        renderInput={(props) => (
                            <input
                                {...props}
                                className="p-[12px] px-6 bg-richblack-700 border-b border-b-richblack-500 rounded-[0.5rem] text-white font-bold shadow-sm w-full placeholder:text-gray-400"
                                placeholder="-"
                                required
                            />
                        )}
                        inputStyle={{
                            width: '40px',
                            color: 'white',
                            backgroundColor: '#333', // Optional for contrast
                            borderRadius: '4px',
                            padding: '8px',
                            textAlign: 'center',
                        }}
                        containerStyle={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '15px',
                            width: 'full',
                        }} // Add gap between input boxes
                    />
                    <button
                        type="submit"
                        className="bg-yellow-50 py-[8px] px-[12px] rounded-[8px] font-bold text-richblack-900"
                        disabled={loading}
                    >
                        Verify Email
                    </button>
                </form>

                <div className="flex justify-between items-baseline mt-4">
                    <Link to="/login" className="text-white mb-2 flex gap-1 items-center">
                        <IoArrowBack />
                        Back to Login
                    </Link>
                    <button
                        onClick={handleResendOTP}
                        className="bg-transparent text-blue-200 underline flex items-center gap-1"
                        disabled={loading}
                    >
                        <GiBackwardTime size={20} />
                        Resend OTP
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
