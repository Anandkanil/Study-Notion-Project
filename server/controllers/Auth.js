const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const OTP = require('../models/OTP');
const Profile = require('../models/Profile')
const otpGenerator = require('otp-generator');
require('dotenv').config()

exports.sendOTP = async function (req, res) {
    try {
        const { email } = req.body;

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'User already registered' });
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

        // Save OTP to the database
        const newOTP = { email, otp };
        await OTP.create(newOTP);

        console.log("OTP generated and sent successfully.");
        return res.status(201).json({
            success: true,
            message: 'OTP generated and sent successfully'
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

    const { firstName, lastName, email, password, confirmPassword, accountType, otp } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !confirmPassword || !otp) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    try {
        // Fetch the latest OTP record for the user
        const latestOtpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 }).limit(1);

        // Check if OTP exists
        if (!latestOtpRecord) {
            return res.status(404).json({ success: false, message: "OTP not found" });
        }

        // Validate the OTP
        if (otp !== latestOtpRecord.otp) {
            return res.status(403).json({ success: false, message: "Invalid OTP" });
        }

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
        const { email, password } = req.body;

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
            return res.status(401).json({ success: false, message: "Invalid Password" });
        }

        // Generate a JWT token
        const token = jwt.sign({ userId: user._id,email:user.email, accountType:user.accountType }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour
        user.token = token;
        user.password = undefined;

        //Generate Cookies
        const options = { expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), httpOnly: true }
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
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.userId;  // Assume the userId is available from authentication middleware

    try {
        // Validate input data
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
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
                const mailResponse = await mailSender(email, "Password Changed - Study Notion", body);
                console.log("Password change confirmation email sent successfully:", mailResponse);
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

