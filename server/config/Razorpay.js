// Import Razorpay
const Razorpay = require('razorpay');

// Create an instance of Razorpay
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,       // Your Razorpay Key ID
    key_secret: process.env.RAZORPAY_KEY_SECRET // Your Razorpay Key Secret
});

// Export the instance if needed
module.exports = razorpayInstance;
