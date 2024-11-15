import React from 'react'
import TimelineImage from '../../../assets/Images/TimelineImage.png'
import  Logo1 from '../../../assets/TimeLineLogo/Logo1.svg';
import  Logo2 from '../../../assets/TimeLineLogo/Logo2.svg';
import  Logo3 from '../../../assets/TimeLineLogo/Logo3.svg';
import  Logo4 from '../../../assets/TimeLineLogo/Logo4.svg';

const TimelineSection = () => {
  const timeline = [
    {
        logo: Logo1,
        heading: "Leadership",
        description: "Fully committed to the success company."
    },
    {
        logo: Logo2,
        heading: "Responsibility",
        description: "Students will always be our top priority."
    },
    {
        logo: Logo3,
        heading: "Flexibility",
        description: "The ability to switch is an important skill."
    },
    {
        logo: Logo4,
        heading: "Solve the problem",
        description: "Code your way to a solution."
    },
]

  return (
    <div>
        <div className='flex gap-15 items-center'>
            {/* left part */}
            <div className='w-[45%] flex flex-col gap-5'>
                {/* card1 */}
                {
                    timeline.map((item, index) => {
                        return (
                            <div key={index} className='flex gap-6 items-center'>
                                <div className='w-[40px] h-[50px]  flex justify-center items-center'>
                                <img src={item.logo} alt="logo" />
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <h3 className='text-[18px] font-semibold'>{item.heading}</h3>
                                    <p className='text-base'>{item.description}</p>
                                </div>
                            </div>
                        )
                    })

                }

            </div>


            {/* right part  */}
            <div className='w-[55%] relative shadow-blue-200 text-white'>
                <img src={TimelineImage} className='shadow-white object-cover h-fit' alt='right' />
                <div className='w-[70%] left-[50%] absolute mx-auto h-12 bg-caribbeangreen-700 flex gap-4 uppercase py-10 translate-x-[-50%] translate-y-[-50%] '>
                    <div className='flex items-center gap-5 border-r border-caribbeangreen-300 px-7'>
                        <p className='text-3xl font-bold'>10</p>
                        <p className='text-caribbeangreen-300 text-sm'>YEARS <br /> EXPERIENCE</p>
                    </div>

                    <div className='flex items-center gap-5  px-7'>
                        <p className='text-3xl font-bold'>250</p>
                        <p className='text-caribbeangreen-300 text-sm'>Types <br /> of courses</p>
                    </div>
                </div>
            </div>

        </div>
    </div>
)
}

export default TimelineSection