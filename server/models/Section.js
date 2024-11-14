const mongoose = require('mongoose');

// Define the Section schema
const sectionSchema = new mongoose.Schema({
  sectionName: {
    type: String,
    required: true
  },
  subSection: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubSection' // Reference to the SubSection schema
    }
  ]
}, {
  timestamps: true // Automatically adds createdAt and updatedAt timestamps
});

// Export the Section model
module.exports = mongoose.model('Section', sectionSchema);
