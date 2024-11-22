import React from 'react'
import { Link } from 'react-router-dom'
import { FaArrowRight } from "react-icons/fa";
import HighlightText from '../components/core/HomePage/HighlightText';
import CTAButton from '../components/core/HomePage/Button'
import Footer from '../components/common/Footer'
import InstructorSection from '../components/core/HomePage/InstructorSection'
import Banner from '../assets/Images/banner.mp4'
import Banner2 from '../assets/Images/banner2.mp4'
import CodeBlocks from '../components/core/HomePage/CodeBlocks';
import TimelineSection from '../components/core/HomePage/TimelineSection';
import LanguageLearningSection from '../components/core/HomePage/LanguageLearningSection';
import ExploreMore from '../components/core/HomePage/ExploreMore'
import { Toaster } from 'react-hot-toast';


const Home = () => {
    
    return (
        <div>
        <Toaster position="top-center" reverseOrder={false} />
            {/* Section 1 */}
            <div className='relative mx-auto flex flex-col w-11/12 max-w-maxContent items-center text-white justify-between'>
            <Link to={"/signup"}>
            <div className=' group mt-16 p-1 mx-auto rounded-full bg-richblack-800 font-bold text-richblack-200
            transition-all duration-200 hover:scale-95 w-fit'>
                <div className='flex flex-row items-center gap-2 rounded-full px-10 py-[5px]
                transition-all duration-200 group-hover:bg-richblack-900'>
                    <p>Become an Instructor</p>
                    <FaArrowRight />
                </div>
            </div>
        </Link>



                <div className='text-center text-4xl font-semibold mt-[70px]'>
                    Empower Your Future with Growth <HighlightText text={"Coding Skills"} />
                </div>

                <div className='text-center w-[90%] mt-4 text-lg font-semibold text-richblack-300 '>
                    With our online coding courses, you can learn at your own pace, from anywhere in the world, and get access to a wealth of resources, including hands-on projects, quizzes, and personalized feedback from instructors. Learn More Book a Demo
                </div>

                <div className='flex gap-7 mt-8'>
                    <CTAButton active={true} linkto={'/signup'}>Learn More</CTAButton>
                    <CTAButton active={false} linkto={'/login'}>Book a Demo</CTAButton>
                </div>

                <div className='shadow-custom-blue mx-3 my-12'>
                    <video muted autoPlay loop>
                        <source src={Banner2} type="video/mp4" />

                    </video>
                </div>

                {/* Code section 1 */}
                <div>
                    <CodeBlocks
                        position={"lg:flex-row"}
                        heading={
                            <div className='text-4xl font-semibold'>
                                Unlock Your
                                <HighlightText text={" coding potential "} />
                                with our online courses
                            </div>
                        }
                        subheading={
                            "Our courses are designed and taught by industry experts who have years of experience in coding and are passionate about sharing their knowledge with you."
                        }
                        ctabtn1={
                            {
                                btnText: "try it yourself",
                                linkto: "/signup",
                                active: true,
                            }
                        }
                        ctabtn2={
                            {
                                btnText: "learn more",
                                linkto: "/login",
                                active: false,
                            }
                        }

                        codeblock={`<!DOCTYPE html>\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>StudyNotion</title>\n<link rel="stylesheet" href="styles.css">\n</head>\n<body>\n</body>\n</html>`}
                        codeColor={"text-yellow-25"}
                    />
                </div>

                <div>
                    <CodeBlocks
                        position={"lg:flex-row-reverse"}
                        heading={
                            <div className='text-4xl font-semibold'>
                                Start
                                <HighlightText text={" Coding in seconds "} />
                            </div>
                        }
                        subheading={
                            "Go ahead, give it a try. Our hands-on learning environment means you'll be writing real code from your very first lesson."
                        }
                        ctabtn1={
                            {
                                btnText: "Continue Lesson",
                                linkto: "/signup",
                                active: true,
                            }
                        }
                        ctabtn2={
                            {
                                btnText: "Learn more",
                                linkto: "/login",
                                active: false,
                            }
                        }

                        codeblock={`<!DOCTYPE html>\n<html>\nhead>\n<title>Learn with Us</title>\n<linkrel="StudyNotion"href="styles.css">\n</head>\n</html>`}
                        codeColor={"text-blue-25"}

                    />
                </div>
                <ExploreMore />
            </div>

            {/* Section 2 */}
            <div className='bg-pure-greys-5 text-richblack-700 mt-17'>
                <div className='homepage_bg h-[310px] '>
                    <div className='w-11/12 max-w-maxContent flex flex-col items-center justify-between gap-5 mx-auto '>
                        <div className='h-[150px]'></div>
                        <div className='flex gap-7 text-white w-full justify-center'>
                            <CTAButton active={true} linkto={'/signup'}>
                                <div className='flex gap-3 items-center'>
                                    Explore Full Catalog
                                    <FaArrowRight />
                                </div>
                            </CTAButton>
                            <CTAButton active={false} linkto={'/login'}>Learn More</CTAButton>
                        </div>

                    </div>

                </div>
                <div className='w-11/12 max-w-maxContent flex flex-col items-center justify-between gap-7 mx-auto'>
                    <div className='flex justify-between gap-5 mb-10 mt-[95px]'>
                        <div className='text-4xl font-semibold w-[45%]'>Get the skills you need for a <HighlightText text={"Job that is in demand."} /></div>
                        <div className='flex flex-col gap-10 items-start w-[40%]'>
                            <div className='text-richblack-500 max-w-maxContent '>Modern StudyNotion dictates its own terms. Today, being a competitive specialist requires more than just professional skills.</div>
                            <CTAButton linkto={"/signup"} active={true}>
                                Learn More
                            </CTAButton>
                        </div>
                    </div>



                    {/* Timeline section */}
                    <TimelineSection />

                    {/* Learning Language Section  */}
                    <LanguageLearningSection />

                </div>

            </div>

            {/* Section 3 */}
            <div className='w-11/12 mx-auto max-w-maxContent flex-col items-center justify-between gap-8 first-letter bg-richblack-900 text-white'>

                <InstructorSection />

                <h2 className='text-center text-4xl font-semobold mt-10'>review from Other Learners</h2>
                {/* Review Slider here */}
            </div>

            {/* Section footer */}
            <Footer/>


        </div>
    )
}

export default Home