import { toast } from "react-hot-toast"

import { setUser } from "../../slices/profileSlice"
import { apiConnector } from "../apiconnector"
import { settingsEndpoints } from "../apis"
import { logout } from "./authAPI"

const {
  UPDATE_DISPLAY_PICTURE_API,
  UPDATE_PROFILE_API,
  CHANGE_PASSWORD_API,
  DELETE_PROFILE_API,
} = settingsEndpoints

// Function to update the user's display picture
export function updateDisplayPicture(token, formData) {
  return async (dispatch) => {
    // Display a loading toast
    const toastId = toast.loading("Updating profile picture...");

    try {
      // Make an API call to update the display picture
      const response = await apiConnector(
        "PUT", // HTTP method
        UPDATE_DISPLAY_PICTURE_API, // API endpoint
        formData, // Data to be sent
        {
          "Content-Type": "multipart/form-data", // Required for file uploads
          Authorization: `Bearer ${token}`, // Bearer token for authentication
        }
      );

      console.log("API Response for updating display picture:", response);

      // Check if the response indicates a failure
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unexpected error occurred");
      }

      // Extract updated user data from the response
      const updatedUser = response.data.data;
      console.log("Updated user data:", updatedUser);

      // Show a success toast
      toast.success("Display picture updated successfully!");

      // Update the user in the Redux store
      dispatch(setUser(updatedUser));

      // Persist the updated user data in localStorage
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("Error while updating display picture:", error);

      // Handle errors and display an appropriate toast
      const errorMessage =
        error.response?.data?.message || "Could not update display picture.";
      toast.error(errorMessage);
    } finally {
      // Dismiss the loading toast
      toast.dismiss(toastId);
    }
  };
}


// Function to update the user's profile
export function updateProfile(token, formData) {
  return async (dispatch) => {
    // Show loading toast
    const toastId = toast.loading("Updating profile...");

    try {
      // API call to update profile
      const response = await apiConnector("PUT", UPDATE_PROFILE_API, formData, {
        Authorization: `Bearer ${token}`,
      });

      console.log("UPDATE_PROFILE_API response:", response);

      // Handle unsuccessful responses
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Profile update failed.");
      }

      // Construct user image (default or custom)
      const updatedUser = response.data.data;
      console.log("The response of Updated profile",response)
      const userImage = updatedUser.image
        ? updatedUser.image
        : `https://api.dicebear.com/5.x/initials/svg?seed=${updatedUser.firstName} ${updatedUser.lastName}`;

      // Update Redux state and localStorage
      const userData = { ...updatedUser, image: userImage };
      dispatch(setUser(updatedUser));
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Show success message
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMessage =
        error.response?.data?.message || "Could not update profile.";
      toast.error(errorMessage);
    } finally {
      // Dismiss the loading toast
      toast.dismiss(toastId);
    }
  };
}

// Function to change the user's password
export async function changePassword(token, formData) {
  // Show loading toast
  const toastId = toast.loading("Changing password...");

  try {
    // API call to change password
    const response = await apiConnector("POST", CHANGE_PASSWORD_API, formData, {
      Authorization: `Bearer ${token}`,
    });

    // console.log("CHANGE_PASSWORD_API response:", response);

    // Handle unsuccessful responses
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Password change failed.");
    }

    // Show success message
    toast.success("Password changed successfully!");
  } catch (error) {
    console.error("Error changing password:", error);
    const errorMessage =
      error.response?.data?.message || "Could not change password.";
    toast.error(errorMessage);
  } finally {
    // Dismiss the loading toast
    toast.dismiss(toastId);
  }
}

// Function to delete the user's profile
export function deleteProfile(token, navigate) {
  return async (dispatch) => {
    // Show loading toast
    const toastId = toast.loading("Deleting profile...");

    try {
      // API call to delete profile
      const response = await apiConnector("DELETE", DELETE_PROFILE_API, null, {
        Authorization: `Bearer ${token}`,
      });

      console.log("DELETE_PROFILE_API response:", response);

      // Handle unsuccessful responses
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Profile deletion failed.");
      }

      // Clear Redux state and localStorage, navigate to login
      toast.success("Profile deleted successfully!");
      localStorage.removeItem("user"); // Clear user data from localStorage
      // dispatch(logout(navigate));
    } catch (error) {
      console.error("Error deleting profile:", error);
      const errorMessage =
        error.response?.data?.message || "Could not delete profile.";
      toast.error(errorMessage);
    } finally {
      // Dismiss the loading toast
      toast.dismiss(toastId);
    }
  };
}