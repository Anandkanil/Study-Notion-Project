const mongoose = require('mongoose');

// Define the Category schema
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 300, // Optional limit for description length
    trim: true
  },
  courses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course' // Reference to the Course schema
    }
  ]
}, {
  timestamps: true // Automatically adds createdAt and updatedAt timestamps
});

// Export the Category model
module.exports = mongoose.model('Category', categorySchema);
