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
    }],
    // Courses a student saved for later
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    // Lessons finished per day (India time, "YYYY-MM-DD"), last 120 days: powers streaks and weekly goals
    learningDays: [{
        _id: false,
        day: String,
        lessons: { type: Number, default: 0 }
    }],
    weeklyGoal: { type: Number, default: 3, min: 1, max: 50 }

}, {
    timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Never send secrets to clients, however a user document is serialised or populated.
const stripSecrets = (doc, ret) => {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    delete ret.token;
    return ret;
};
userSchema.set('toJSON', { transform: stripSecrets });

// Export the User model
module.exports = mongoose.model('User', userSchema);
