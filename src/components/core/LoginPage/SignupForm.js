import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { AiOutlineEyeInvisible, AiOutlineEye } from "react-icons/ai";
export default function SignupForm({ setIsLoggedIn }) {
    const navigate = useNavigate();
    function submitHandler(e) {
        e.preventDefault();
        if (formData.email !== "" && formData.password !== "" && formData.firstname !== "" && formData.lastname !== "") {
            if (formData.password !== formData.confirmpassword) {
                toast.error("Password doesn't match");
                return;
            }
            const finalData={...formData,accountType};
            toast.success("Account Created");
            setIsLoggedIn(true);
            console.log(finalData)
            navigate('/dashboard');
        }
    }

    const [formData, setFormData] = useState({
        firstname: "",
        lastname: "",
        password: "",
        confirmpassword: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [accountType,setAccountType]=useState("student");
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    function changeHandler(e) {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    }
    return (
        <div>
            <div className='flex bg-richblack-800 p-1 gap-x-1 my-6 rounded-full max-w-max'>
                <button onClick={()=>{setAccountType("student")}} className={`${accountType==='student'?"bg-richblack-900 text-richblack-5":"bg-transparent text-richblack-200"}  py-2 px-5 rounded-full transition-all duration-200`}>Student</button>
                <button onClick={()=>{setAccountType("instructor")}} className={`${accountType==='instructor'?"bg-richblack-900 text-richblack-5":"bg-transparent text-richblack-200"} -200 py-2 px-5 rounded-full transition-all duration-200`}>Instructor</button>
            </div>
            <form onSubmit={submitHandler} className='w-full flex flex-col gap-y-4'>
                <div className='flex gap-x-4'>
                    <label>
                        <p className='text-[0.875rem] leading-[1.375rem] text-richblack-5 mb-1'>FirstName <sup className='text-pink-200'>*</sup></p>
                        <input className='p-[12px] bg-richblack-800 rounded-[0.5rem] text-richblack-5 w-full'
                            required
                            type='text'
                            name='firstname'
                            value={formData.firstName}
                            onChange={changeHandler}
                            placeholder='Enter First Name' />
                    </label>
                    <label>
                        <p className='text-[0.875rem] leading-[1.375rem] text-richblack-5 mb-1'>Last Name <sup className='text-pink-200'>*</sup></p>
                        <input className='p-[12px] bg-richblack-800 rounded-[0.5rem] text-richblack-5 w-full'
                            required
                            type='text'
                            name='lastname'
                            value={formData.lastName}
                            onChange={changeHandler}
                            placeholder='Enter Last Name' />
                    </label>
                </div>
                <label className='w-full'>
                    <p className='text-[0.875rem] leading-[1.375rem] text-richblack-5 mb-1'>Email Address<sup className='text-pink-200'>*</sup></p>
                    <input className='p-[12px] bg-richblack-800 rounded-[0.5rem] text-richblack-5 w-full'
                        required
                        type='email'
                        name='email'
                        value={formData.email}
                        onChange={changeHandler}
                        placeholder='Enter Email Address' />
                </label>

                {/* Create Password and Confirm Password  */}
                <div className='flex gap-x-4'>
                    <label className='relative'>
                        <p className='text-[0.875rem] leading-[1.375rem] text-richblack-5 mb-1'>Create Password<sup className='text-pink-200'>*</sup></p>
                        <input required className='w-full p-[12px] pr-10 bg-richblack-800 rounded-[0.5rem] text-richblack-5' name='password' value={formData.password} onChange={changeHandler} type={showPassword ? "text" : "password"} placeholder='Enter Password' />
                        <span className='absolute right-3 top-[38px] z-[10] cursor-pointer' onClick={() => { setShowPassword(!showPassword) }}>
                            {showPassword ? <AiOutlineEyeInvisible color="white" height="1em" width="1em" font-size="24" /> : <AiOutlineEye color="white" height="1em" width="1em" font-size="24" />}
                        </span>
                    </label>
                    <label className='relative'>
                        <p className='text-[0.875rem] leading-[1.375rem] text-richblack-5 mb-1'>Confirm Password<sup className='text-pink-200'>*</sup></p>
                        <input required className='w-full p-[12px] pr-10 bg-richblack-800 rounded-[0.5rem] text-richblack-5' name='confirmpassword' value={formData.confirmpassword} onChange={changeHandler} type={showConfirmPassword ? "text" : "password"} placeholder='Confirm Password' />
                        <span className='text-xl absolute h-full right-3 top-[38px] z-[10] cursor-pointer' onClick={() => { setShowConfirmPassword(!showConfirmPassword) }}>
                            {showConfirmPassword ? <AiOutlineEyeInvisible color="white" height="1em" width="1em" font-size="24" /> : <AiOutlineEye color="white" height="1em" width="1em" font-size="24" />}
                        </span>
                    </label>
                </div>
                <button type='submit' className='bg-yellow-50 py-[8px] px-[12px] rounded-[8px] mt-6 font-medium text-richblack-900'>Create Account</button>
            </form>
        </div>
    )
}
