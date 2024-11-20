import React from 'react'
import { useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/core/Dashboard/Sidebar';

const Dashboard = () => {
    const {loading:authLoading}=useSelector((state)=>state.auth.loading); 
    const {loading:profileLoading}=useSelector((state)=>state.profile.loading); 

    if(profileLoading || authLoading)return(<div>Loading not completed</div>)
  return (
    <div className='relative flex h-[calc(100vh-3.5rem)]'>
        <Sidebar />
        <div className='min-h-[calc(100vh-3.5rem)] overflow-auto w-full'>
            <div className='mx-auto w-11/12 max-w-[1000px] pt-10'>
                <Outlet />
            </div>
        </div>

    </div>
  )
}

export default Dashboard