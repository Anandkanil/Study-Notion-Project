const mongoose = require('mongoose');

// Define the User schema
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    accountType: {
        type: String,
        enum: ['Admin', 'Student', 'Instructor'],
        default: 'Student'
    },
    additionalDetails: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
    },
    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    image: {
        type: String,
    },
    resetPasswordToken:{
        type:String
    },
    resetPasswordExpires:{
        type:String
    },
    courseProgress: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CourseProgress'
    }]

}, {
    timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Export the User model
module.exports = mongoose.model('User', userSchema);
