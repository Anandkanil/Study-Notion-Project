import React from 'react'
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
    const { token } = useSelector((state) => state.auth);
    const location = useLocation();

    if (token !== null) return children;

    // Remember where the visitor was going so login can send them back there
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
}

export default PrivateRoute
