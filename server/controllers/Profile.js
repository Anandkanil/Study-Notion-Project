const User = require('../models/User');
const Profile = require('../models/Profile');
const { uploadImageToCloudinary } = require('../utils/imageUploader');

exports.updateProfile = async function (req, res) {
    const { gender, dateOfBirth, about, contactNumber } = req.body;
    const userId = req.user.userId; // Assuming the user ID is extracted from an authenticated token

    // Validate required field for contactNumber
    if (!contactNumber) {
        return res.status(400).json({
            success: false,
            message: "Contact number is required"
        });
    }

    try {
        // Find the user and populate additionalDetails
        const user = await User.findById(userId).populate('additionalDetails');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Update profile fields
        const updatedProfileData = {
            gender: gender || user.additionalDetails.gender,
            dateOfBirth: dateOfBirth || user.additionalDetails.dateOfBirth,
            about: about || user.additionalDetails.about,
            contactNumber: contactNumber || user.additionalDetails.contactNumber
        };

        // Update the profile in the database
        const updatedProfile = await Profile.findByIdAndUpdate(
            user.additionalDetails._id,
            updatedProfileData,
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            profile: updatedProfile
        });

    } catch (error) {
        console.error("Error updating profile:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating the profile"
        });
    }
};


exports.deleteAccount = async function (req, res) {
    const userId = req.user.userId; // Assuming the user ID is extracted from an authenticated token

    try {
        // Find the user with populated profile details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Delete the profile associated with the user
        if (user.additionalDetails) {
            await Profile.findByIdAndDelete(user.additionalDetails);
        }

        //Also we need to remove all the courses listing of the deleted Instructor ----> We won't delete the instructoer details from course details 
        //Also we need to remove all the courses listing of the deleted Student


        // Delete the user account
        await User.findByIdAndDelete(userId);

        return res.status(200).json({
            success: true,
            message: "Account and profile deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting account:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while deleting the account"
        });
    }
};


exports.getCurrentUserDetails = async function (req, res) {
    try {
        // Get the user's ID from the request (assuming authentication middleware sets req.userId)
        const userId = req.userId;

        // Find the user by ID and populate profile details
        const user = await User.findById(userId)
            .populate('additionalDetails') // Populates the profile details for the user
            .select('-password -resetPasswordToken -resetPasswordExpires'); // Exclude sensitive fields

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: user,
            message: "User details retrieved successfully"
        });

    } catch (error) {
        console.error("Error retrieving user details:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while retrieving user details"
        });
    }
};

exports.getAllUserDetails = async function (req, res) {
    try {
        // Fetch all users from the User model
        const users = await User.find()
            .populate('additionalDetails') // Populates profile details for each user
            .select('-password -resetPasswordToken -resetPasswordExpires'); // Exclude sensitive fields

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No users found"
            });
        }

        return res.status(200).json({
            success: true,
            data: users,
            message: "All user details retrieved successfully"
        });

    } catch (error) {
        console.error("Error retrieving users:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while retrieving user details"
        });
    }
};
exports.updateDisplayPicture = async (req, res) => {
    try {
      const displayPicture = req.files.displayPicture
      const userId = req.user.userId
      const image = await uploadImageToCloudinary(
        displayPicture,
        process.env.FOLDER_NAME,
        1000,
        1000
      )
      console.log(image)
      const updatedProfile = await User.findByIdAndUpdate(
        { _id: userId },
        { image: image.secure_url },
        { new: true }
      )
      res.send({
        success: true,
        message: `Image Updated successfully`,
        data: updatedProfile,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
};
exports.getEnrolledCourses = async (req, res) => {
    try {
      const userId = req.user.userId;
  
      // Fetch user details along with their enrolled courses
      const userDetails = await User.findOne({ _id: userId })
        .populate("courses")
        .exec();
  
      // Check if the user exists
      if (!userDetails) {
        return res.status(404).json({
          success: false,
          message: `User not found with ID: ${userId}`,
        });
      }
  
      // Check if the user has enrolled in any courses
      if (userDetails.courses.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No courses enrolled",
          data: [],
        });
      }
  
      // Return the list of enrolled courses
      return res.status(200).json({
        success: true,
        data: userDetails.courses,
      });
    } catch (error) {
      // Handle unexpected errors
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
  