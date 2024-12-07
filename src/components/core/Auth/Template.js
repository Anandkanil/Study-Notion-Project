import React from 'react'
import frameImage from '../../../assets/Images/frame.png'
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
// import { FcGoogle } from "react-icons/fc";
const Template= ({title,desc1,desc2,image,formType,setIsLoggedIn})=> {
  return (
    <div className='flex justify-between w-11/12 max-w-[1160px] mx-auto py-12 flex-col-reverse gap-y-12 md:gap-y-0 md:gap-x-12 md:flex-row mt-12'>
    {/* left part div */}
        <div className='w-11/12 max-w-[450px] mx-auto '>
            <h1 className='text-richblack-5 font-semibold text-[1.875rem] leading-[2.375rem]'>{title}</h1>
            <p className='text-[1.125rem] leading-[1.625rem] mt-4'>
            <span className='text-richblack-100'>{desc1}</span>
            <br></br>
            <span className='text-blue-100 italic'>{desc2}</span>
            </p>
          {
            formType==="signup"?<SignupForm setIsLoggedIn={setIsLoggedIn}/>:<LoginForm setIsLoggedIn={setIsLoggedIn}/>
          }
          {/* <div className='w-full flex items-center gap-x-2 my-4'>
            <div className='flex-1 h-[1px] bg-richblack-700'></div>
            <p className='text-white'>OR</p>
            <div className='flex-1 h-[1px] bg-richblack-700'></div>
          </div>
          <button className='w-full flex justify-center items-center gap-x-2 py-[8px] px-[12px] rounded-[8px] mt-6 font-medium text-richblack-100 border border-richblack-700'>
            <FcGoogle></FcGoogle>
            <p>Sign In with Google</p>
          </button>   */}

        </div>

{/* right part div  */}
        <div className='p-7'>
            <div className='relative  border-red-600'>
            <img className='relative top-0 left-0 z-5 ' src={frameImage} width={558} height={504} loading='lazy' alt='Pattern' />
            <img className='absolute md:bottom-5 md:right-5 lg:bottom-5 lg:right-5 z-10 bottom-0 right-0' src={image} width={558} height={490} loading='lazy' alt='Students' />
            </div>
        </div>
    </div>
  )
}

export default Template;
