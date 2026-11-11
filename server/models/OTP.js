const mongoose = require('mongoose');

// Define the OTP schema
const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true
  },
  otp: {
    type: String,
    required: true,
   // minlength: 6, // Assuming OTP is a 6-digit code
   // maxlength: 6
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '5m' // OTP expires after 5 minutes (5 * 60 seconds)
  }
});
// The verification email is sent by the sendOTP controller, which can report failures.

// Export the OTP model
module.exports = mongoose.model('OTP', otpSchema);
