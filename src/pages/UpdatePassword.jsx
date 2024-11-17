import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { resetPassword } from '../services/operations/authAPI';
import { useLocation, useParams } from 'react-router-dom';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';

const UpdatePassword = () => {
    // Get the current location object
    const location = useLocation();

    // State to toggle password visibility
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Extract loading state from Redux store
    const { loading } = useSelector((state) => state.auth.loading);

    // Extract the token from the URL
    const { token } = useParams();
    const decodedToken = decodeURIComponent(token);


    // Dispatch function to trigger Redux actions
    const dispatch = useDispatch();

    // State to handle form data
    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    });

    // Handle form input changes
    function handleOnChange(e) {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value, // Dynamically update the respective input field
        }));
    }

    // Handle form submission
    function handleOnSubmit(e) {
        e.preventDefault();

        // Dispatch the reset password action with the form data and token
        dispatch(resetPassword(formData.password, formData.confirmPassword, decodedToken));
    }

    return (
        <div>
            <div>
                {
                    loading ? (
                        // Show a loading indicator when the loading state is true
                        <div>Loading...</div>
                    ) : (
                        <form onSubmit={handleOnSubmit}>
                            <h1>Choose a new Password</h1>
                            <p>Almost done. Enter your new password and you're all set.</p>
                            
                            {/* Input for New Password */}
                            <label>
                                <p>New Password</p>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="******"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleOnChange}
                                />
                                <span onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
                                </span>
                            </label>

                            {/* Input for Confirm New Password */}
                            <label>
                                <p>Confirm New Password</p>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    placeholder="******"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleOnChange}
                                />
                                <span onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? <AiFillEyeInvisible /> : <AiFillEye />}
                                </span>
                            </label>

                            {/* Submit Button */}
                            <button type="submit">Reset Password</button>
                        </form>
                    )
                }
            </div>
        </div>
    );
};

export default UpdatePassword;
