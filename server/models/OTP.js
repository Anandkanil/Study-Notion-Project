const mongoose = require('mongoose');
const mailSender = require('../utils/mailSender');
const emailVerificationTemplate =require('../mail/templates/emailVerificationTemplate');

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
//send verification email 
async function sendVerificationEmail(email,emailBody) {
    try {
        const mailResponse=await mailSender(email,"Verification email from Study Notion",emailBody);
        console.log("OTP Verification Mail is sent successfully",mailResponse);
    } catch (error) {
        console.log("Error occure while sending OTP verification mail ",error);
    }    
}

otpSchema.pre('save',async function (next) {
    const emailContent = emailVerificationTemplate(this.otp); 
    await sendVerificationEmail(this.email,emailContent);
    next();
})

// Export the OTP model
module.exports = mongoose.model('OTP', otpSchema);
