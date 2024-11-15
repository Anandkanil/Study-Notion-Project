import React from 'react'
import know_your_progress from '../../../assets/Images/Know_your_progress.png'
import compare_with_others from '../../../assets/Images/Compare_with_others.png'
import plan_your_lessons from '../../../assets/Images/Plan_your_lessons.png'
import HighlightText from './HighlightText'
import CTAButton from './Button'

const LanguageLearningSection = () => {
    return (
        <div className='mt-[130px]'>
            <div className='flex flex-col gap-5'>
                <div className='text-4xl font-semibold text-center'>
                    Your Swiss knife for
                    <HighlightText text={" learning any language"} />
                </div>
                <div className='text-center text-richblack-600 mx-auto text-base mt-3 font-medium w-[70%]'>
                    Using spin making learning multiple languages easy, with 20+ languages realistic voice-over, progress tracking, custom schedule and more.
                </div>

                <div className='flex flex-row items-center justify-center mt-5'>
                    <img src={know_your_progress} className='object-contain -mr-32' alt='Know your progress ' />
                    <img src={compare_with_others} className='object-contain' alt='Compare with others ' />
                    <img src={plan_your_lessons} className='object-contain -ml-36' alt='Plan your lesson ' />
                </div>

                <div className='w-fit mx-auto'>
                    <CTAButton active={true} linkto={'/signup'}>
                        <div className='flex gap-3 items-center'>
                            Learn More
                        </div>
                    </CTAButton>
                </div>
            </div>
        </div>
    )
}

export default LanguageLearningSection