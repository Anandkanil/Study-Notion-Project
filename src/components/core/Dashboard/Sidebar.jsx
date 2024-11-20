import React, { useState } from "react";
import { sidebarLinks } from "../../../data/dashboard-links";
import { logout } from "../../../services/operations/authAPI";
import { useDispatch, useSelector } from "react-redux";
import SidebarLink from "./SidebarLink";
import { useNavigate } from "react-router-dom";
import { VscSignOut } from "react-icons/vsc";
import ConfirmationModal from "../../common/ConfirmationModal";

const Sidebar = () => {
  // Extract loading states from Redux store
  const { loading: authLoading } = useSelector((state) => state.auth);
  const { user, loading: profileLoading } = useSelector((state) => state.profile);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State to manage the visibility of the confirmation modal
  const [confirmationModal, setConfirmationModal] = useState(null);


  // Display a loading message if profile or authentication data is still loading
  if (profileLoading || authLoading) return <div>Loading not completed</div>;

  return (
    <div className="flex min-h-[222px] flex-col border-r-[1px] border-r-richblack-700 h-[calc(100vh-3.5rem)] bg-richblack-800 pt-10 ">
      {/* Render the sidebar links */}
      <div className="flex flex-col text-white">
        {sidebarLinks.map((link, index) => {
          // Filter links based on user account type
          if (link.type && user.accountType !== link.type) {
            return null;
          }
          return (
            <SidebarLink
              key={index}
              name={link.name}
              path={link.path}
              type={link.type}
              iconName={link.icon}
            />
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-auto mt-6 mb-6 h-[1px] w-10/12 bg-richblack-600 "></div>

      {/* Settings link */}
      <SidebarLink
        name="Settings"
        path="dashboard/settings"
        iconName="VscSettingsGear"
      />

      {/* Logout Button Styled as Sidebar Link */}
      <div
        onClick={() =>
          setConfirmationModal({
            text1: "Are you sure?",
            text2: "You will be logged out of your account.",
            btn1Text: "Logout",
            btn2Text: "Cancel",
            btn1Handler: () => {
              dispatch(logout(navigate));
              setConfirmationModal(null);
            },
            btn2Handler: () => setConfirmationModal(null),
          })
        }
        className="relative px-8 py-2 text-sm cursor-pointer hover:bg-yellow-800 transition-all duration-300 text-white"
      >
        {/* Highlight Bar */}
        <span className="absolute left-0 top-0 h-full w-[0.2rem] bg-yellow-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>

        {/* Logout Icon and Text */}
        <div className="flex items-center gap-2">
          <VscSignOut className="text-lg" />
          <span>Logout</span>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmationModal && (
        <ConfirmationModal
          text1={confirmationModal.text1}
          text2={confirmationModal.text2}
          btn1Text={confirmationModal.btn1Text}
          btn2Text={confirmationModal.btn2Text}
          btn1Handler={confirmationModal.btn1Handler}
          btn2Handler={confirmationModal.btn2Handler}
        />
      )}
    </div>
  );
};

export default Sidebar;
