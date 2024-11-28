import React, { useEffect, useState } from 'react';
import logo from "../../assets/Logo/Logo-Full-Light.png";
import { Link, matchPath } from 'react-router-dom';
import { NavbarLinks } from "../../data/navbar-links";
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AiOutlineShoppingCart } from "react-icons/ai";
import ProfileDropDown from '../core/Auth/ProfileDropDown';
import { apiConnector } from '../../services/apiconnector';
import { categories } from '../../services/apis';
import { FaChevronDown } from "react-icons/fa6";

// Navbar Component
const Navbar = () => {
    // State to store sublinks for category dropdown
    const [subLinks, setSubLinks] = useState([]);
    const [loading, setLoading] = useState(false)
    const [loadingCategories, setLoadingCategories] = useState(true); // To handle loading state for categories

    // Function to fetch sublinks (categories) from API
    const fetchSubLinks = async () => {
        try {
            const result = await apiConnector("GET", categories.CATEGORIES_API);
            // console.log("The result of API Call is",result);
            setSubLinks(result.data?.data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoadingCategories(false); // Set loading to false after fetch completes
        }
    };

    // React Router hooks to track the current location
    const location = useLocation();

    // Redux state values for authentication and cart details
    const token = useSelector((state) => state.auth.token); // User's authentication token
    const { user } = useSelector((state) => state.profile); // User profile data
    const totalItems = useSelector((state) => state.cart.totalItems); // Total items in the shopping cart

    // Function to check if the route matches the current path
    const matchRoute = (route) => {
        return matchPath({ path: route }, location.pathname);
    };

    // Fetch sublinks data only on component mount
    useEffect(() => {
        fetchSubLinks();
    }, [user, token]);

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
                        {NavbarLinks.map((link, index) => (
                            <li key={index}>
                                {link.title === "Catalog" ? (
                                    <>
                                        <div
                                            className={`group relative flex cursor-pointer items-center gap-1 ${matchRoute("/catalog/:catalogName")
                                                    ? "text-yellow-25"
                                                    : "text-richblack-25"
                                                }`}
                                        >
                                            <p>{link.title}</p>
                                            <FaChevronDown />
                                            <div className="invisible absolute left-[50%] top-[50%] z-[1000] flex w-[200px] translate-x-[-50%] translate-y-[3em] flex-col rounded-lg bg-richblack-5 p-4 text-richblack-900 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-[1.65em] group-hover:opacity-100 lg:w-[300px]">
                                                <div className="absolute left-[50%] top-0 -z-10 h-6 w-6 translate-x-[80%] translate-y-[-40%] rotate-45 select-none rounded bg-richblack-5"></div>
                                                {loading ? (
                                                    <p className="text-center">Loading...</p>
                                                ) : subLinks.length ? (
                                                    <>
                                                        {subLinks
                                                            ?.filter(
                                                                (subLink) => subLink?.courses?.length > 0
                                                            )
                                                            ?.map((subLink, i) => (
                                                                <Link
                                                                    to={`/catalog/${subLink.name
                                                                        .split(" ")
                                                                        .join("-")
                                                                        .toLowerCase()}`}
                                                                    className="rounded-lg bg-transparent py-4 pl-4 hover:bg-richblack-50"
                                                                    key={i}
                                                                >
                                                                    <p>{subLink.name}</p>
                                                                </Link>
                                                            ))}
                                                    </>
                                                ) : (
                                                    <p className="text-center">No Courses Found</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <Link to={link?.path}>
                                        <p
                                            className={`${matchRoute(link?.path)
                                                    ? "text-yellow-25"
                                                    : "text-richblack-25"
                                                }`}
                                        >
                                            {link.title}
                                        </p>
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Authentication & Cart Section */}
                <div className='flex gap-x-4 items-center'>
                    {/* Display cart icon only if user is logged in and is not an instructor */}
                    {user && user?.accountType !== "Instructor" && (
                        <Link to="/dashboard/cart" className='relative'>
                            <AiOutlineShoppingCart className='text-white' size={20} />
                            {totalItems > 0 && (
                                // Display total items in cart if greater than 0
                                <span className='absolute'>{totalItems}</span>
                            )}
                        </Link>
                    )}

                    {/* Show Login and Signup buttons if user is not logged in */}
                    {token === null && (
                        <>
                            <Link to="/login">
                                <button className='border border-richblack-700 bg-richblack-800 px-[12px] py-[5px] text-richblack-100 rounded-md'>
                                    Login
                                </button>
                            </Link>
                            <Link to="/signup">
                                <button className='border border-richblack-700 bg-richblack-800 px-[12px] py-[5px] text-richblack-100 rounded-md'>
                                    SignUp
                                </button>
                            </Link>
                        </>
                    )}

                    {/* Show Profile Dropdown if user is logged in */}
                    {user != null && (
                        <ProfileDropDown />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Navbar;
