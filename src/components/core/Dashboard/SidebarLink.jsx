import React from "react";
import * as Icons from "react-icons/vsc";
import { NavLink, useLocation } from "react-router-dom";

const SidebarLink = ({ name, path, type, iconName }) => {
  const Icon = Icons[iconName];
  const location = useLocation();

  // Check if the current route matches the provided path
  const matchRoute = (route) => {
    return location.pathname === route;
  };

  return (
    <NavLink
      to={path}
      className={`relative px-8 py-2 text-sm transition-all duration-300 text-white ${
        matchRoute(path) ? "bg-yellow-800" : "hover:bg-yellow-800"
      }`}
    >
      {/* Highlight bar */}
      <span
        className={`absolute left-0 top-0 h-full w-[0.2rem] bg-yellow-50 ${
          matchRoute(path) ? "opacity-100" : "opacity-0 hover:opacity-100"
        } transition-opacity duration-300`}
      ></span>

      {/* Icon and Text */}
      <div className="flex items-center gap-2">
        <Icon className="text-lg" />
        <span>{name}</span>
      </div>
    </NavLink>
  );
};

export default SidebarLink;
