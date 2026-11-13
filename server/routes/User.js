// Import the required modules
const express = require("express")
const router = express.Router()

// Import the required controllers and middleware functions
const {
  login,
  signUp,
  sendOTP,
  changePassword,
} = require("../controllers/Auth")
const {
  createPasswordResetToken,
  resetPassword,
} = require("../controllers/ResetPassword")

const { auth } = require("../middlewares/auth")
const social = require("../controllers/SocialAuth")
const { rateLimit, emailKey } = require("../middlewares/rateLimit")

const MIN = 60 * 1000
// Per address and per account, so one attacker can't lock out a whole network
const limits = {
  loginIp: rateLimit({ name: "login-ip", windowMs: 15 * MIN, max: 30 }),
  loginAccount: rateLimit({ name: "login-acct", windowMs: 15 * MIN, max: 8, key: emailKey,
    message: "Too many wrong attempts for this account. Wait 15 minutes, or reset your password." }),
  otpIp: rateLimit({ name: "otp-ip", windowMs: 60 * MIN, max: 10 }),
  otpAccount: rateLimit({ name: "otp-acct", windowMs: 10 * MIN, max: 3, key: emailKey,
    message: "We've sent several codes already. Check your inbox and spam, or wait 10 minutes for a new one." }),
  signupIp: rateLimit({ name: "signup-ip", windowMs: 15 * MIN, max: 15 }),
  resetIp: rateLimit({ name: "reset-ip", windowMs: 60 * MIN, max: 10 }),
  resetAccount: rateLimit({ name: "reset-acct", windowMs: 15 * MIN, max: 3, key: emailKey,
    message: "We've sent several reset links already. Check your inbox and spam, or wait 15 minutes." }),
  newPasswordIp: rateLimit({ name: "newpass-ip", windowMs: 15 * MIN, max: 10 }),
  changePasswordIp: rateLimit({ name: "changepass-ip", windowMs: 15 * MIN, max: 10 }),
}

// Routes for Login, signUp, and Authentication

// ********************************************************************************************************
//                                      Authentication routes
// ********************************************************************************************************

// Route for user login
router.post("/login", limits.loginIp, limits.loginAccount, login)

// Route for user signUp
router.post("/signup", limits.signupIp, signUp)

// Route for sending OTP to the user's email
router.post("/sendotp", limits.otpIp, limits.otpAccount, sendOTP)

// Route for Changing the password
router.post("/changepassword", limits.changePasswordIp, auth, changePassword)

// ********************************************************************************************************
//                                      Reset Password
// ********************************************************************************************************

// Route for generating a reset password token
router.post("/reset-password-token", limits.resetIp, limits.resetAccount, createPasswordResetToken)

// Route for resetting user's password after verification
router.post("/reset-password", limits.newPasswordIp, resetPassword)

// Sign in with Google / GitHub
router.get("/providers", social.providers)
router.post("/google", limits.loginIp, social.google)
router.post("/github", limits.loginIp, social.github)

// One-click read-only demo: { role: "student" | "instructor" | "admin" }
router.post("/demo", limits.loginIp, require("../controllers/Demo").demoLogin)

// Export the router for use in the main application
module.exports = router
