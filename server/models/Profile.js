const mongoose = require('mongoose');

// Define the Profile schema
const profileSchema = new mongoose.Schema({
    gender: {
        type: String
    },
    dateOfBirth: {
        type: Date,
        default: new Date('2002-01-31')
    },
    about: {
        type: String,
        trim: true
    },
    contactNumber: {
        type: String,
    }
}, {
    timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Export the Profile model
module.exports = mongoose.model('Profile', profileSchema);
