import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { AiOutlineEyeInvisible,AiOutlineEye } from "react-icons/ai";
import { Link, useNavigate } from 'react-router-dom';

export default function LoginForm({setIsLoggedIn}) {
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    })
    function changeHandler(e) {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        })
    }
    
    const [showPassword, setShowPassword] = useState(false);
    const navigate=useNavigate();

    function submitHandler(e){
        e.preventDefault();
        if(formData.email!=="" && formData.password!==""){
            toast.success("Logged In");
            setIsLoggedIn(true);
            navigate('/dashboard');
            console.log(formData);
        }
    }
    return (
        
        <form onSubmit={submitHandler} className='w-full flex flex-col gap-y-4 mt-6'>
            <label className='w-full'>
                <p className='text-[0.875rem] leading-[1.375rem] text-richblack-5 mb-1'>Email Address<sup className='text-pink-200'>*</sup></p>
                <input className='p-[12px] bg-richblack-800 rounded-[0.5rem] text-richblack-5 w-full' name='email' value={formData.email} onChange={changeHandler} type='email' placeholder='Enter email Address' required />
            </label>
            <label className='relative'>
                <p className='text-[0.875rem] leading-[1.375rem] text-richblack-5 mb-1'>Password<sup className='text-pink-200'>*</sup></p>
                <input name='password' className='p-[12px] bg-richblack-800 rounded-[0.5rem] text-richblack-5 w-full' value={formData.password} onChange={changeHandler} type={showPassword ? "text" : "password"} placeholder='Enter Password' required />
                <span className='absolute right-3 top-[38px] z-[10] cursor-pointer' onClick={() => { setShowPassword(!showPassword) }}>
                    {showPassword ? <AiOutlineEyeInvisible color="white" height="1em" width="1em" font-size="24"/> : <AiOutlineEye color="white" height="1em" width="1em" font-size="24"/>}
                </span>
            <Link to="#"><p className='text-xs mt-1 text-blue-100 max-w-max ml-auto'>Forgot Password?</p></Link>
            </label>
            <button className='bg-yellow-50 py-[8px] px-[12px] rounded-[8px] mt-6 font-medium text-richblack-900' type='submit'>Sign In</button>

        </form>
    )
}
