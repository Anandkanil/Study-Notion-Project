import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { getFullDetailsOfCourse } from '../../../../../../services/operations/courseDetailsAPI';
import { setCourse, setEditCourse } from '../../../../../../slices/courseSlice';
import RenderSteps from '../../RenderSteps';

const EditCourse = () => {
    const dispatch=useDispatch();
    // eslint-disable-next-line
    const [loading,setLoading]=useState(false);
    const {courseId}=useParams();
    const{course}=useSelector((state)=>state.course);
    const {token}=useSelector((state)=>state.auth);

    useEffect(() => {
        const populateCourseDetails = async () => {
          setLoading(true);
          const result = await getFullDetailsOfCourse(courseId, token);
          dispatch(setEditCourse(true));
          dispatch(setCourse(result?.courseDetails));
          setLoading(false);
        }
        populateCourseDetails();
      }, [courseId, dispatch, token])

  return (
    <div>
    <h1>Edit Course</h1>
    <div>
        {
            course? (<RenderSteps/>): (<div>Course Not Found</div>)
        }
    </div>
    </div>
  )
}

export default EditCourse