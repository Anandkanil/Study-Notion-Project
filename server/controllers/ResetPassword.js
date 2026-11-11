const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const passwordResetTokenMailTemplate = require('../mail/templates/passwordResetLink');
const mailSender = require('../utils/mailSender');

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://studynotion-project-1.netlify.app').replace(/\/+$/, '');

// Only a SHA-256 hash of the token is stored, so a leaked database row can't be used to reset a password.
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

exports.createPasswordResetToken = async function (req, res) {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    try {
        const user = await User.findOne({ email });

        if (user) {
            const resetToken = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = hashToken(resetToken);
            user.resetPasswordExpires = Date.now() + RESET_TOKEN_TTL_MS;
            await user.save();

            const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;
            const mailBody = passwordResetTokenMailTemplate.passwordReset(user.email, user.firstName, resetUrl);
            await mailSender(user.email, 'Password Reset Request', mailBody);
        }

        // Same answer whether or not the email is registered
        return res.status(200).json({
            success: true,
            message: 'If an account exists for this email, a reset link has been sent.',
        });
    } catch (error) {
        console.error('Reset token error:', error.message);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request',
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword, token } = req.body;

        if (!password || !confirmPassword || !token) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Password and Confirm Password do not match' });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }

        const userDetails = await User.findOne({ resetPasswordToken: hashToken(token) });
        if (!userDetails) {
            return res.status(400).json({ success: false, message: 'This reset link is invalid or has already been used' });
        }
        if (!(Number(userDetails.resetPasswordExpires) > Date.now())) {
            return res.status(400).json({ success: false, message: 'This reset link has expired. Please request a new one' });
        }

        userDetails.password = await bcrypt.hash(password, 10);
        // One-time use
        userDetails.resetPasswordToken = undefined;
        userDetails.resetPasswordExpires = undefined;
        await userDetails.save();

        return res.status(200).json({ success: true, message: 'Password Reset Successful' });
    } catch (error) {
        console.error('Reset password error:', error.message);
        return res.status(500).json({ success: false, message: 'Some error occurred while updating the password' });
    }
};
