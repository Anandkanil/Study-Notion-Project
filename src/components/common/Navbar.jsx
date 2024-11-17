import React, { useEffect, useState } from 'react';
import logo from "../../assets/Logo/Logo-Full-Light.png";
import { Link, matchPath } from 'react-router-dom';
import { NavbarLinks } from "../../data/navbar-links";
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AiOutlineShoppingCart } from "react-icons/ai";
import ProfileDropDown from '../core/Auth/ProfileDropDown.jss';
import { apiConnector } from '../../services/apiconnector';
import { categories } from '../../services/apis';
import { FaChevronDown } from "react-icons/fa6";

// Navbar component
const Navbar = () => {
    // State to store sublinks for category dropdown
    const [subLinks, setSubLinks] = useState([]);

    // Fetch sublinks from API (categories)
    const fetchSubLinks = async () => {
        try {
            // Making an API call to fetch category data
            const result = await apiConnector("GET", categories.CATEGORIES_API);
            setSubLinks(result.data.allCategories); // Set the fetched sublinks to state
        } catch (error) {
            console.log("Could not fetch the Category List");
        }
    };

    // Fetch sublinks data on component mount
    useEffect(() => {
        fetchSubLinks();
    }, []);

    // React Router hooks to track the current location
    const location = useLocation();
    
    // Function to check if the route matches the current path
    const matchRoute = (route) => {
        return matchPath({ path: route }, location.pathname);
    };

    // Redux state values for authentication and cart details
    const token = useSelector((state) => state.auth.token); // User's authentication token
    const user = useSelector((state) => state.profile.user); // User profile data
    const totalItems = useSelector((state) => state.cart.totalItems); // Total items in the shopping cart

    return (
        <div className='flex h-14 items-center justify-center border-b-[1px] border-b-richblack-700'>
            <div className='flex w-11/12 max-w-maxContent items-center justify-between'>
                {/* Logo Section */}
                <Link to="/">
                    <img src={logo} width={160} height={42} loading='lazy' alt="Logo" />
                </Link>

                {/* Navbar Links */}
                <nav>
                    <ul className='flex gap-x-6 text-richblack-25'>
                        {
                            // Loop through NavbarLinks and render them
                            NavbarLinks.map((link, index) => (
                                <li key={index}>
                                    {
                                        link.title === "Catalog" ? (
                                            // Dropdown for Catalog link
                                            <div className='relative flex items-center gap-2 group'>
                                                <p>{link.title}</p>
                                                <FaChevronDown size={13} />

                                                {/* Dropdown menu for categories */}
                                                <div className='invisible opacity-0 absolute left-[50%] z-[10] translate-x-[-50%] flex flex-col gap-4 translate-y-[50%] top-[-25%] rounded-md bg-richblack-700 p-5 text-richblack-50 shadow-lg transition-all duration-300 group-hover:visible group-hover:opacity-100 lg:w-[320px]'>
                                                    {/* Triangle pointer */}
                                                    <div className='absolute left-[50%] top-[0] translate-x-[80%] translate-y-[-45%] h-6 w-6 rotate-45 rounded bg-richblack-700 shadow-md'></div>

                                                    {/* Dropdown links */}
                                                    {
                                                        subLinks.length ? (
                                                            subLinks.map((subLink, index) => (
                                                                <Link to={`${subLink.name}`} key={index} className='relative hover:bg-richblack-600 p-2 rounded-md transition-all duration-200'>
                                                                    <p className='text-sm'>{subLink.name}</p>

                                                                    {/* Bottom line (border) with enhanced style */}
                                                                    <div className='absolute bottom-0 left-0 w-full h-[2px] bg-richblack-500 opacity-30 transition-all duration-300 group-hover:opacity-100'></div>
                                                                </Link>
                                                            ))
                                                        ) : (
                                                            <div className='text-sm text-center text-richblack-300'>No categories available</div>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        ) : (
                                            // Regular link rendering for other items
                                            <Link to={link?.path}>
                                                <p className={`${matchRoute(link.path) ? "text-yellow-5" : "text-white"}`}>
                                                    {link.title}
                                                </p>
                                            </Link>
                                        )
                                    }
                                </li>
                            ))
                        }
                    </ul>
                </nav>

                {/* Authentication & Cart Section */}
                <div className='flex gap-x-4 items-center'>
                    {
                        // Display cart icon only if user is logged in and is not an instructor
                        user && user?.accountType !== "Instructor" && (
                            <Link to="/dashboard/cart" className='relative'>
                                <AiOutlineShoppingCart />
                                {
                                    totalItems > 0 && (
                                        // Display total items in cart if greater than 0
                                        <span className='absolute'>{totalItems}</span>
                                    )
                                }
                            </Link>
                        )
                    }

                    {/* Show Login button if user is not logged in */}
                    {
                        token == null && (
                            <Link to="/login">
                                <button className='border border-richblack-700 bg-richblack-800 px-[12px] py-[5px] text-richblack-100 rounded-md'>Login</button>
                            </Link>
                        )
                    }

                    {/* Show SignUp button if user is not logged in */}
                    {
                        token == null && (
                            <Link to="/signup" >
                                <button className='border border-richblack-700 bg-richblack-800 px-[12px] py-[5px] text-richblack-100 rounded-md'>SignUp</button>
                            </Link>
                        )
                    }

                    {/* Show Profile Dropdown if user is logged in */}
                    {
                        token != null && (
                            <ProfileDropDown />
                        )
                    }
                </div>
            </div>
        </div>
    );
};

export default Navbar;
