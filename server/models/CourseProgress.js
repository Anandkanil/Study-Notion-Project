const mongoose = require('mongoose');

// Define the CourseProgress schema
const courseProgressSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course', // Reference to the Course schema
    required: true
  },
  completedVideos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubSection' // Reference to the SubSection schema (for individual videos)
    }
  ]
}, {
  timestamps: true // Automatically adds createdAt and updatedAt timestamps
});

// Export the CourseProgress model
module.exports = mongoose.model('CourseProgress', courseProgressSchema);
