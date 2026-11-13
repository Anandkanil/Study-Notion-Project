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
    // Linked sign-in providers (set when someone signs in with Google or GitHub)
    googleId: { type: String, index: true, sparse: true },
    githubId: { type: String, index: true, sparse: true },
    // Courses a student saved for later
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    // The lesson a student opened most recently, for "Pick up where you left off" on any device
    lastLesson: {
        _id: false,
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
        subSection: { type: mongoose.Schema.Types.ObjectId, ref: 'SubSection' },
        at: Date,
    },
    // Lessons a student bookmarked to rewatch (newest first, max 200)
    savedLessons: [{
        _id: false,
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
        subSection: { type: mongoose.Schema.Types.ObjectId, ref: 'SubSection', required: true },
        at: { type: Date, default: Date.now },
    }],
    // Lessons finished per day (India time, "YYYY-MM-DD"), last 120 days: powers streaks and weekly goals
    learningDays: [{
        _id: false,
        day: String,
        lessons: { type: Number, default: 0 }
    }],
    weeklyGoal: { type: Number, default: 3, min: 1, max: 50 },
    // Email choices; the weekly learning reminder is on unless turned off
    emailPrefs: {
        _id: false,
        weeklyDigest: { type: Boolean, default: true },
    },
    // The Sunday a weekly reminder was last sent ("week-YYYY-MM-DD"), so it goes once a week
    lastDigestWeek: { type: String },
    // Set by an admin: a suspended account can't log in or use the API
    suspended: { type: Boolean, default: false },
    suspendedReason: { type: String, maxlength: 300 }

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
