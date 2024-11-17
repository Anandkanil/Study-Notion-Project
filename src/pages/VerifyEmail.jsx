import React, { useEffect, useState } from 'react';
import OTPInput from 'react-otp-input';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../services/operations/authAPI';

const VerifyEmail = () => {
    // State to hold the OTP entered by the user
    const [otp, setOtp] = useState("");
    const navigate = useNavigate();

    // Extract the signup data and loading state from Redux store
    const { signupData = {}, loading } = useSelector((state) => state.auth);

    // Redirect user to signup page if signupData doesn't exist
    useEffect(() => {
        if (!signupData) {
            navigate('/signup');
        }
    }, [signupData, navigate]);

    // Destructure signupData object to get user details
    const {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        accountType,
        contactNumber,
    } = signupData;

    // Dispatch function to trigger actions
    const dispatch = useDispatch();

    // Handler for form submission (Verifying OTP and completing sign up)
    const handleOnSubmit = (e) => {
        e.preventDefault();
        // Dispatch signUp action with all the form data along with OTP
        dispatch(
            signUp(
                firstName,
                lastName,
                email,
                password,
                confirmPassword,
                accountType,
                otp,
                navigate
            )
        );
    };

    // Handler to resend the OTP if the user clicks the "Resend OTP" button
    const handleResendOTP = () => {
        // Uncomment and implement the following when resendOTP action is available
        // dispatch(resendOTP(email));
        console.log("Resend OTP functionality not implemented.");
    };

    return (
        <div>
            {/* Show loading message if loading state is true */}
            {loading ? (
                <div>Loading...</div>
            ) : (
                <div>
                    {/* Main content of the page */}
                    <h1>Verify Email</h1>
                    <p>
                        A verification code has been sent to your email. Enter the code below to verify your account.
                    </p>

                    {/* OTP Input Form */}
                    <form onSubmit={handleOnSubmit}>
                        <OTPInput
                            value={otp}
                            onChange={setOtp} // Updates OTP state when the user types
                            numInputs={6} // Number of OTP digits expected
                            renderInput={(props) => <input {...props} />} // Render each OTP input field
                        />
                        {/* Submit button for verifying the OTP */}
                        <button type="submit" disabled={loading}>
                            Verify Email
                        </button>
                    </form>

                    {/* Additional Links and Actions */}
                    <div>
                        {/* Link to navigate back to login page */}
                        <div>
                            <Link to='/login'>
                                <p>Back to Login</p>
                            </Link>
                        </div>

                        {/* Button to resend the OTP */}
                        <div>
                            {/* Optionally, you can add an SVG or icon here */}
                            <button onClick={handleResendOTP} disabled={loading}>
                                Resend OTP
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerifyEmail;
