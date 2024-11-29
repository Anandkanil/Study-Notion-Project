import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom';
import {buyCourse} from '../services/operations/studentFeaturesAPI'

const CourseDetails = () => {

  const {token}=useSelector((state)=>state.auth);
  const {user}=useSelector((state)=>state.profile);
  const dispatch=useDispatch();
  const navigate =useNavigate();
  const {courseId}=useParams();

    const handleBuyCourse=async()=>{
        try {
            if(token){
              buyCourse(token,[courseId],user,navigate,dispatch);
              return;
            }
        } catch (error) {
            
        }
    }
  return (
    <div>
        <div>
            <button className='bg-yellow-50 p-4' onClick={()=>handleBuyCourse()}>Buy Now</button>
        </div>
    </div>
  )
}

export default CourseDetails