const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const OTP = require('../models/OTP');
const Profile = require('../models/Profile')
const otpGenerator = require('otp-generator');
const mailSender = require('../utils/mailSender');
const  {passwordUpdated}  = require('../mail/templates/passwordUpdate');
const emailVerificationTemplate = require('../mail/templates/emailVerificationTemplate');
require('dotenv').config()

// Wrong sign-up codes per email. After MAX_OTP_ATTEMPTS the code is thrown away,
// so a 6-digit code can't be guessed within its 5 minutes.
const MAX_OTP_ATTEMPTS = 5;
const SESSION_DAYS = 7; // stay logged in for a week
const otpFailures = new Map(); // email -> { count, until }
const otpFailureCount = (email) => {
    const f = otpFailures.get(email);
    if (!f || f.until < Date.now()) { otpFailures.delete(email); return 0; }
    return f.count;
};
exports._otpFailures = otpFailures; // for tests

exports.sendOTP = async function (req, res) {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
        if (!email) {
            return res.status(400).json({ success: false, message: 'Enter your email address.' });
        }
        // A fresh code resets the wrong-guess count
        otpFailures.delete(email);

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists. Log in instead.' });
        }

        // Define OTP generation options once
        const otpOptions = { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false, digits: true };

        // Generate OTP and check for uniqueness with limited retries
        let otp;
        for (let attempts = 0; attempts < 5; attempts++) {
            otp = otpGenerator.generate(6, otpOptions);
            const otpExists = await OTP.findOne({ otp });
            if (!otpExists) break;
            otp = null; // reset OTP if duplicate
        }

        // If we exhausted the retry attempts
        if (!otp) {
            return res.status(500).json({ success: false, message: 'Failed to generate a unique OTP, please try again later.' });
        }

        // Save the code, then email it; if the email can't be sent, say so instead of pretending
        const saved = await OTP.create({ email, otp });
        const sent = await mailSender(email, "Your StudyNotion verification code", emailVerificationTemplate(otp));
        if (!sent) {
            await OTP.deleteOne({ _id: saved._id });
            return res.status(503).json({
                success: false,
                message: "We couldn't send the verification email right now. Please try again in a few minutes."
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Verification code sent. Check your inbox.'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


exports.signUp = async function (req, res) {

    const str = (v) => (typeof v === 'string' ? v.trim() : '');
    const firstName = str(req.body.firstName);
    const lastName = str(req.body.lastName);
    const email = str(req.body.email);
    const otp = str(req.body.otp);
    const accountType = req.body.accountType;
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const confirmPassword = typeof req.body.confirmPassword === 'string' ? req.body.confirmPassword : '';

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword || !otp) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    // Admin accounts can never be created through public sign-up
    const SIGNUP_ROLES = ['Student', 'Instructor'];
    if (accountType && !SIGNUP_ROLES.includes(accountType)) {
        return res.status(400).json({ success: false, message: "Invalid account type" });
    }

    try {
        // Fetch the latest OTP record for the user
        const latestOtpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 }).limit(1);

        // Check if OTP exists
        if (!latestOtpRecord) {
            return res.status(404).json({ success: false, message: "That code has expired. Request a new one." });
        }

        // Validate the OTP, with a cap on wrong guesses
        if (otp !== latestOtpRecord.otp) {
            const count = otpFailureCount(email) + 1;
            if (count >= MAX_OTP_ATTEMPTS) {
                otpFailures.delete(email);
                await OTP.deleteMany({ email });
                return res.status(429).json({ success: false, message: "Too many wrong codes. Request a new code and try again." });
            }
            otpFailures.set(email, { count, until: Date.now() + 10 * 60 * 1000 });
            const left = MAX_OTP_ATTEMPTS - count;
            return res.status(403).json({ success: false, message: `That code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.` });
        }
        otpFailures.delete(email);

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        //Creating a new Profile
        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about: null,
            contactNumber: null
        })

        // Create new user
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            accountType,
            additionalDetails: profileDetails._id,
            image: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(firstName)}%20${encodeURIComponent(lastName)}&bold=true`
        });

        await newUser.save();

        return res.status(201).json({
            success: true,
            message: "User signup successful"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "An error occurred during signup"
        });
    }
}

exports.login = async function (req, res) {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
        const password = typeof req.body.password === 'string' ? req.body.password : '';

        // Validate email and password input
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        // Check if the user exists
        const user = await User.findOne({ email }).populate('additionalDetails');
        if (!user) {
            return res.status(401).json({ success: false, message: "You are not registered with us yet. Please sign up to get started!" });
        }

        // Verify the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "That password isn't right. Try again, or reset it." });
        }

        // Generate a JWT token
        const token = jwt.sign({ userId: user._id,email:user.email, accountType:user.accountType }, process.env.JWT_SECRET, { expiresIn: SESSION_DAYS + 'd' });
        user.token = token;
        user.password = undefined;

        //Generate Cookies
        const options = { expires: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000), httpOnly: true, secure: true, sameSite: 'lax' }
        res.cookie('token', token, options).status(200).json({
            success: true,
            message: "Login successful",
            token,
            data:user
        });

        // Send response with token
        // return res.status(200).json({
        //     success: true,
        //     message: "Login successful",
        //     token
        // });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred during login. Please try again."
        });
    }
};

exports.resetPassword = async function (req, res) {
    const {newPassword, confirmPassword, resetToken } = req.body; 

    try {
        // Validate input data
        if (!resetToken || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }

        // Find the user by resetToken
        const user = await User.findOne({ resetToken });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        //Check the token is expired or not
        if (Date.now()>user.resetPasswordExpires) {
            return res.status(404).json({ success: false, message: 'Reset Token expired' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Send password reset confirmation email
        async function sendResetPasswordEmail(email) {
            try {
                const body = "Your account password has been reset successfully. Please log in to your Study Notion account using the link below.";
                const mailResponse = await mailSender(email, "Password Changed Confirmation - Study Notion", body);
                console.log("Password confirmation email sent successfully:", mailResponse);
            } catch (error) {
                console.error("Error occurred while sending password confirmation email:", error);
            }
        }
        await sendResetPasswordEmail(user.email);

        // Save the updated user
        await user.save();

        // Respond with success
        return res.status(200).json({
            success: true,
            message: 'Password reset successful',
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

exports.changePassword = async function (req, res) {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;  // Assume the userId is available from authentication middleware

    try {
        // Validate input data
        if (!oldPassword || !newPassword ) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        if (String(newPassword).length < 8) {
            return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
        }

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if the old password matches the current password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect old password' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Save the updated user
        await user.save();

        // Send password change confirmation email
        async function sendPasswordChangeEmail(email) {
            try {
                const body = "Your account password has been successfully changed. If you did not request this change, please contact support immediately.";
                const emailContent=passwordUpdated(email,user.firstName)
                mailSender.inBackground(email, "Password Changed - Study Notion", emailContent);
            } catch (error) {
                console.error("Error occurred while sending password change email:", error);
            }
        }
        await sendPasswordChangeEmail(user.email);

        // Respond with success
        return res.status(200).json({
            success: true,
            message: 'Password changed successfully',
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

