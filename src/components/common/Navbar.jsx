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
    const [subLinks, setSubLinks] = useState([]);
    // eslint-disable-next-line
    const [loading, setLoading] = useState(false);
    // eslint-disable-next-line
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const fetchSubLinks = async () => {
        try {
            const result = await apiConnector("GET", categories.CATEGORIES_API);
            setSubLinks(result.data?.data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoadingCategories(false);
        }
    };

    const location = useLocation();
    const token = useSelector((state) => state.auth.token);
    const { user } = useSelector((state) => state.profile);
    const totalItems = useSelector((state) => state.cart.totalItems);

    const matchRoute = (route) => {
        return matchPath({ path: route }, location.pathname);
    };

    useEffect(() => {
        fetchSubLinks();
    }, [user, token]);

    return (
        <div className='flex h-14 items-center justify-center border-b-[1px] border-b-richblack-700'>
            <div className='flex w-11/12 max-w-maxContent items-center justify-between'>
                {/* Logo Section - Hidden on small screens */}
                <Link to="/" className="hidden sm:block">
                    <img src={logo} width={160} height={42} loading='lazy' alt="Logo" />
                </Link>

                {/* Mobile Hamburger Icon */}
                <button 
                    className="lg:hidden p-2 text-white" 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <div className={`w-6 h-0.5 bg-white transition-transform ${isMobileMenuOpen ? "ml-2 rotate-45 translate-y-2" : ""}`}></div>
                    <div className={`w-6 h-0.5 bg-white mt-1 transition-transform ${isMobileMenuOpen ? "opacity-0" : ""}`}></div>
                    <div className={`w-6 h-0.5 bg-white mt-1 transition-transform ${isMobileMenuOpen ? "ml-2 -rotate-45 -translate-y-1" : ""}`}></div>
                </button>

                {/* Navbar Links */}
                <nav className={`lg:flex gap-x-6 text-richblack-25 sm:text-red ${isMobileMenuOpen ? "block absolute top-14 left-0 w-full bg-richblack-800 p-6 z-50" : "hidden lg:block"}`}>
                    <ul className='flex flex-col lg:flex-row gap-y-4 lg:gap-x-6'>
                        {NavbarLinks.map((link, index) => (
                            <li key={index}>
                                {link.title === "Catalog" ? (
                                    <div className={`group relative flex cursor-pointer items-center gap-1 ${matchRoute("/catalog/:catalogName") ? "text-yellow-25" : "text-richblack-25"}`}>
                                        <p>{link.title}</p>
                                        <FaChevronDown />
                                        <div className="invisible absolute left-[50%] top-[50%] z-[1000] flex w-[200px] translate-x-[-50%] translate-y-[3em] flex-col rounded-lg bg-richblack-5 p-4 text-richblack-900 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-[1.65em] group-hover:opacity-100 lg:w-[300px]">
                                            <div className="absolute left-[50%] top-0 -z-10 h-6 w-6 translate-x-[80%] translate-y-[-40%] rotate-45 select-none rounded bg-richblack-5"></div>
                                            {loading ? (
                                                <p className="text-center">Loading...</p>
                                            ) : subLinks.length ? (
                                                subLinks?.filter((subLink) => subLink?.courses?.length > 0).map((subLink, i) => (
                                                    <Link
                                                        to={`/catalog/${subLink.name.split(" ").join("-").toLowerCase()}`}
                                                        className="rounded-lg bg-transparent py-4 pl-4 hover:bg-richblack-50"
                                                        key={i}
                                                    >
                                                        <p>{subLink.name}</p>
                                                    </Link>
                                                ))
                                            ) : (
                                                <p className="text-center">No Courses Found</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <Link to={link?.path}>
                                        <p className={`${matchRoute(link?.path) ? "text-yellow-25" : "text-richblack-25"}`}>
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
                    {user && user?.accountType !== "Instructor" && (
                        <Link to="/dashboard/cart" className='relative'>
                            <AiOutlineShoppingCart className='text-white' size={20} />
                            {totalItems > 0 && (
                                <span className='absolute -top-3 -right-2 bg-caribbeangreen-300 rounded-full px-1 text-xs font-bold '>{totalItems}</span>
                            )}
                        </Link>
                    )}

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

                    {user != null && <ProfileDropDown />}
                </div>
            </div>
        </div>
    );
};

export default Navbar;
