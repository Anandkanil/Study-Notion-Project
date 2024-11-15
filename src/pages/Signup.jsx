import React from 'react'
import Template from '../components/core/LoginPage/Template'
import signUpImage from '../assets/Images/signup.webp'
export default function Signup({setIsLoggedIn}) {
  return <Template
  title="Join the millions learning to code with StudyNotion for free"
  desc1="Build skills for today, tomorrow, and beyond"
  desc2="Education to future-proof your career."
  image={signUpImage}
  formType="signup"
  setIsLoggedIn={setIsLoggedIn}

/>
}
