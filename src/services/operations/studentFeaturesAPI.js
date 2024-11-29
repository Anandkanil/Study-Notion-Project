import { toast } from "react-hot-toast";
import { studentEndpoints } from "../apis";
import { apiConnector } from "../apiconnector";
import rzpLogo from "../../assets/Logo/rzp_logo.png";
import { setPaymentLoading } from "../../slices/courseSlice";
import { resetCart } from "../../slices/cartSlice";

// Define Razorpay Key ID from environment variables
const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY;

// Endpoints for API requests
const {
    COURSE_PAYMENT_API,
    COURSE_VERIFY_API,
    SEND_PAYMENT_SUCCESS_EMAIL_API,
} = studentEndpoints;

// Function to dynamically load external scripts (Razorpay SDK)
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;

        // On successful script load
        script.onload = () => resolve(true);
        // On error loading script
        script.onerror = () => reject(new Error("Failed to load the script."));
        document.body.appendChild(script);
    });
}

// Main function to handle course purchase
export async function buyCourse(token, courses, userDetails, navigate, dispatch) {
    const toastId = toast.loading("Loading..."); // Show loading toast during the payment process
    
    try {
        // Load Razorpay SDK dynamically
        const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");

        // Check if Razorpay SDK loaded successfully
        if (!res) {
            toast.error("Razorpay SDK failed to load. Please check your network connection.");
            return;
        }

        // Check if Razorpay Key is provided in environment variables
        if (!RAZORPAY_KEY_ID) {
            toast.error("Razorpay Key is not defined in the environment variables.");
            return;
        }

        // Initiate the payment order API call to backend
        const orderResponse = await apiConnector(
            "POST",
            COURSE_PAYMENT_API,
            { courses },
            {
                Authorization: `Bearer ${token}`,
            }
        );

        // Handle errors from order creation
        if (!orderResponse || !orderResponse.data.success) {
            throw new Error(orderResponse?.data?.message || "Failed to initiate payment order.");
        }

        console.log("Order Response:", orderResponse);

        // Define Razorpay payment options (amount, currency, order_id, etc.)
        const options = {
            key: RAZORPAY_KEY_ID, // Razorpay Key ID
            currency: orderResponse.data.message.currency,
            amount: `${orderResponse.data.message.amount}`,
            order_id: orderResponse.data.message.id,
            name: "StudyNotion", // Payment description (e.g., course name)
            description: "Thank You for Purchasing the Course",
            image: rzpLogo, // Logo to be displayed during payment
            prefill: {
                name: `${userDetails.firstName}`,
                email: userDetails.email,
            },
            // Payment success handler (to verify payment and enroll)
            handler: function (response) {
                sendPaymentSuccessEmail(response, orderResponse.data.message.amount, token);
                // console.log("The response for verify payment is ", response);
                verifyPayment({ ...response, courses }, token, navigate, dispatch);
            },
        };

        // Create a new Razorpay instance and open the payment gateway
        const paymentObject = new window.Razorpay(options);
        paymentObject.open();

        // Payment failure handler (toast error message)
        paymentObject.on("payment.failed", function (response) {
            toast.error("Oops, payment failed.");
            console.error("Payment Failed:", response.error);
        });
    } catch (error) {
        console.error("Payment API Error:", error);
        toast.error(error.message || "Could not complete the payment process.");
    } finally {
        toast.dismiss(toastId); // Dismiss loading toast once process completes
    }
}

// Function to send payment success email
async function sendPaymentSuccessEmail(response, amount, token) {
    try {
        await apiConnector(
            "POST",
            SEND_PAYMENT_SUCCESS_EMAIL_API,
            {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                amount,
            },
            {
                Authorization: `Bearer ${token}`,
            }
        );
    } catch (error) {
        console.error("Payment Success Email Error:", error);
    }
}

// Function to verify the payment and enroll the student in the course
async function verifyPayment(bodyData, token, navigate, dispatch) {
    const toastId = toast.loading("Verifying Payment..."); // Show loading toast while verifying payment
    dispatch(setPaymentLoading(true)); // Set loading state for payment process
    try {
        // Call backend API to verify the payment
        const response = await apiConnector("POST", COURSE_VERIFY_API, bodyData, {
            Authorization: `Bearer ${token}`,
        });

        // Handle errors in payment verification
        if (!response || !response.data.success) {
            throw new Error(response?.data?.message || "Payment verification failed.");
        }

        // On success, show success toast and navigate to enrolled courses page
        toast.success("Payment successful! You are now enrolled in the course.");
        navigate("/dashboard/enrolled-courses");

        // Reset the cart after successful enrollment
        dispatch(resetCart());
    } catch (error) {
        console.error("Payment Verification Error:", error);
        toast.error(error.message || "Could not verify the payment.");
    } finally {
        toast.dismiss(toastId); // Dismiss loading toast after verification
        dispatch(setPaymentLoading(false)); // Reset loading state
    }
}
