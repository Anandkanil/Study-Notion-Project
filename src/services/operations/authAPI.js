import { toast } from "react-hot-toast";
import { setLoading, setToken } from "../../slices/authSlice";
// import { resetCart } from "../../slices/cartSlice" // Uncomment when used
import { setUser } from "../../slices/profileSlice";
import { apiConnector } from "../apiconnector";
import { endpoints } from "../apis";

const {
  SENDOTP_API,
  SIGNUP_API,
  LOGIN_API,
  RESETPASSTOKEN_API,
  RESETPASSWORD_API,
} = endpoints;

// Function to send OTP
export function sendOtp(email, navigate) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading..."); // Show loading toast
    dispatch(setLoading(true)); // Set loading state to true

    try {
      // Making a POST request to the SENDOTP_API endpoint
      const response = await apiConnector("POST", SENDOTP_API, {
        email,
        checkUserPresent: true, // Option to check if the user already exists
      });

      console.log("SENDOTP API RESPONSE:", response); // Log the API response

      if (!response.data.success) {
        throw new Error(response.data.message); // Handle unsuccessful response
      }

      // Success: Notify and navigate to verify email
      toast.success("OTP Sent Successfully");
      navigate("/verify-email");
    } catch (error) {
      console.error("SENDOTP API ERROR:", error);

      // Improved error handling
      const errorMessage = error.response?.data?.message || "Could Not Send OTP";
      toast.error(errorMessage);
    } finally {
      dispatch(setLoading(false)); // Reset loading state
      toast.dismiss(toastId); // Dismiss loading toast
    }
  };
}

// Function to handle signup
export function signUp(firstName, lastName, email, password, confirmPassword, accountType, otp, navigate) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...");
    dispatch(setLoading(true));

    try {
      const response = await apiConnector("POST", SIGNUP_API, {
        firstName,
        lastName,
        email,
        password,
        confirmPassword,
        accountType,
        otp,
      });

      if (!response.data.success) {
        throw new Error(response.data.message); // Handle unsuccessful response
      }

      // Success: Notify and navigate to login
      toast.success("Signup Successful");
      navigate("/login");
    } catch (error) {
      console.error("SIGNUP API ERROR:", error);
      const errorMessage = error.response?.data?.message || "Signup Failed";
      toast.error(errorMessage);
      navigate("/signup"); // Ensure navigation on failure
    } finally {
      dispatch(setLoading(false));
      toast.dismiss(toastId);
    }
  };
}

export function login(email,password,navigate){
  return async (dispatch)=>{
    // const toastId = toast.loading("Loading...");
    dispatch(setLoading(true));
    try {
      const response=await apiConnector('POST',LOGIN_API,{email,password});
      if(!response.data.success){
        throw new Error(response.data.message);
      }

      toast.success("Log In Success");
      navigate('/');

    } catch (error) {
      console.error("Authentication ERROR:", error.message);
      const errorMessage = error.response?.data?.message || "Login Failed";
      toast.error(errorMessage);
    }
    finally{
      dispatch(setLoading(false));
      // toast.dismiss(toastId);
    }
  }
}

// Function to request password reset token
export function getPasswordResetToken(email, setEmailSent) {
  return async (dispatch) => {
    dispatch(setLoading(true));

    try {
      const response = await apiConnector("POST", RESETPASSTOKEN_API, { email });

      console.log("RESET PASSWORD TOKEN RESPONSE:", response);

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      // Success: Notify and update state
      toast.success("Reset Email Sent");
      setEmailSent(true);
    } catch (error) {
      console.error("RESET PASSWORD TOKEN ERROR:", error);
      toast.error("Failed to send email for resetting password");
    } finally {
      dispatch(setLoading(false));
    }
  };
}

// Function to reset password
export function resetPassword(password, confirmPassword, token) {
  return async (dispatch) => {
    dispatch(setLoading(true));

    try {
      const response = await apiConnector("POST", RESETPASSWORD_API, {
        password,
        confirmPassword,
        token,
      });

      console.log("RESET PASSWORD RESPONSE:", response);

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      // Success: Notify user
      toast.success("Password has been reset successfully");
    } catch (error) {
      console.error("RESET PASSWORD ERROR:", error);
      toast.error("Unable to reset password");
    } finally {
      dispatch(setLoading(false));
    }
  };
}
