const crypto = require('crypto');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // User model
const mailSender = require('../utils/mailSender'); // Custom mail function or use Nodemailer

exports.createPasswordResetToken = async function (req, res) {
    const { email } = req.body;

    try {
        // Step 1: Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Step 2: Generate a secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Step 3: Hash the token before storing it in the database
        const hashedToken = await bcrypt.hash(resetToken, 10);

        // Step 4: Set the reset token and expiration in the user document
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 5 * 60 * 1000; // Token expires in 5 minutes
        await user.save();

        // Step 5: Create the password reset URL
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${hashedToken}`;

        // Step 6: Send the reset URL to the user's email
        const mailBody = `Hello ${user.firstName},\n\nYou requested a password reset. Please use the following link to reset your password:\n\n${resetUrl}\n\nThis link will expire in 5 minutes.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nYour App Team`;
        await mailSender(user.email, "Password Reset Request", mailBody);

        // Step 7: Respond with a success message
        return res.status(200).json({
            success: true,
            message: 'Password reset link has been sent to your email',
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while processing your request',
        });
    }
};

exports.resetPassword = async (req, res) => {
	try {
		const { password, confirmPassword, token } = req.body;

		if (confirmPassword !== password) {
			return res.json({
				success: false,
				message: "Password and Confirm Password Does not Match",
			});
		}
		const userDetails = await User.findOne({ resetPasswordToken: token });
		if (!userDetails) {
			return res.json({
				success: false,
				message: "Token is Invalid",
			});
		}
		if (!(userDetails.resetPasswordExpires > Date.now())) {
			return res.status(403).json({
				success: false,
				message: `Token is Expired, Please Regenerate Your Token`,
			});
		}
		const encryptedPassword = await bcrypt.hash(password, 10);
		await User.findOneAndUpdate(
			{ resetPasswordToken: token },
			{ password: encryptedPassword },
			{ new: true }
		);
		res.json({
			success: true,
			message: `Password Reset Successful`,
		});
	} catch (error) {
		return res.json({
			error: error.message,
			success: false,
			message: `Some Error in Updating the Password`,
		});
	}
};