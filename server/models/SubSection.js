const mongoose = require('mongoose');

// Define the SubSection schema
const subSectionSchema = new mongoose.Schema({
    title: {
        type: String,
    },
    timeDuration: {
        type: String
    },
    description: {
        type: String
    },
    videoUrl: {
        type: String
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt timestamps
});

// Export the SubSection model
module.exports = mongoose.model('SubSection', subSectionSchema);
