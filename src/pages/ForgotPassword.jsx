import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom';
import { getPasswordResetToken } from '../services/operations/authAPI';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
    const { loading } = useSelector((state) => state.auth);
    const [emailSent, setEmailSent] = useState(false);
    const [email, setEmail] = useState("");
    const dispatch=useDispatch();

    const handleOnSubmit=(e)=>{
        e.preventDefault();
        dispatch(getPasswordResetToken(email,setEmailSent))

    }

    return (
        <div className='w-full min-h-screen flex justify-center items-center border-4'>
            {
                loading ? (<div>Loading</div>) :
                    (
                        <div>
                            <h1>
                                {
                                    !emailSent ? "Reset your Password" : "Check Your Email"
                                }
                            </h1>

                            <p>
                                {
                                    !emailSent ? "Have no fear. We'll email you instructions to reset your password. If you don'thave access to your email we can try account recovery" :
                                        `We have sent the reset email to ${email}`
                                }
                            </p>
                            <form onSubmit={handleOnSubmit} className='flex flex-row'>
                                {
                                    !emailSent && (
                                        <label><p>Email Address</p>
                                            <input required type="email" name='email' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Enter Your Email Address' />
                                        </label>
                                    )
                                }
                                <button>
                                    {
                                        !emailSent ? "Reset Password" : "Resend Email"
                                    }
                                </button>
                            </form>

                            <div>
                                <Link to='/login' ><p>Back to login</p></Link>
                            </div>

                        </div>
                    )
            }
        </div>
    )
}

export default ForgotPassword