import React from 'react';
import { Link } from 'react-router-dom';
import pageNotFoundImage from '../assets/Images/page-not-found.jpg'; // Add your image to the assets folder

const PageNotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-100 to-gray-200">
      <div className="text-center">
        {/* Page Not Found Image */}
        <img 
          src={pageNotFoundImage} 
          alt="Page Not Found" 
          className="w-80 mx-auto mb-8" 
        />

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Page Not Found
        </h1>

        {/* Subtitle */}
        <p className="text-gray-600 mb-6">
          Sorry, the page you are looking for doesn’t exist or has been moved.
        </p>

        {/* Go Back Button */}
        <Link to="/" className="bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-md hover:bg-yellow-600 transition-all">
          Go Back to Home
        </Link>
      </div>
    </div>
  );
};

export default PageNotFound;
