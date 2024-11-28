import { FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../../../common/ConfirmationModal";
import { deleteProfile } from "../../../../services/operations/SettingsAPI";
import { useState } from "react";
import { logout } from "../../../../services/operations/authAPI";

export default function DeleteAccount() {
  const { token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // State to manage the visibility of the confirmation modal
  const [confirmationModal, setConfirmationModal] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handles account deletion
  async function handleDeleteAccount() {
    try {
      setLoading(true);
      await dispatch(deleteProfile(token, navigate)); // Await to handle async logic
      setConfirmationModal(null);
      dispatch(logout(navigate)); // Close the modal after successful deletion
    } catch (error) {
      console.error("Error deleting account: ", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="my-10 flex flex-row gap-x-5 rounded-md border-[1px] border-pink-700 bg-pink-900 p-8 px-12">
        {/* Icon Container */}
        <div className="flex aspect-square h-14 w-14 items-center justify-center rounded-full bg-pink-700">
          <FiTrash2 className="text-3xl text-pink-200" />
        </div>

        {/* Content Section */}
        <div className="flex flex-col space-y-2">
          <h2 className="text-lg font-semibold text-richblack-5">
            Delete Account
          </h2>
          <div className="w-3/5 text-pink-25">
            <p>Would you like to delete your account?</p>
            <p>
              This account may contain paid courses. Deleting your account is
              permanent and will remove all associated content.
            </p>
          </div>

          {/* Delete Button */}
          <button
            disabled={loading}
            type="button"
            className={`w-fit cursor-pointer italic ${
              loading ? "text-pink-500 cursor-not-allowed" : "text-pink-300"
            }`}
            onClick={() =>
              setConfirmationModal({
                text1: "Are you sure you want to delete this account?",
                text2:
                  "Deleting this account will permanently erase all associated data and cannot be undone.",
                btn1Text: !loading ? "Confirm Deletion" : "Deleting...",
                btn2Text: "Cancel",
                btn1Handler: !loading ? handleDeleteAccount : () => {},
                btn2Handler: !loading ? () => setConfirmationModal(null) : () => {},
              })
            }
          >
            I want to delete my account.
          </button>
        </div>

        {/* Confirmation Modal */}
        {confirmationModal && <ConfirmationModal modalData={confirmationModal} />}
      </div>
    </>
  );
}
