import React from 'react'
import Template from '../components/core/LoginPage/Template'
import loginImage from '../assets/Images/login.webp' 
export default function Login({setIsLoggedIn}) {
  return (
    <Template
      title="Welcome Back"
      desc1="Build skills for today, tomorrow, and beyond."
      desc2="Education to future-proof your career."
      image={loginImage}
      formType="login"
      setIsLoggedIn={setIsLoggedIn}

    />
  )
}
