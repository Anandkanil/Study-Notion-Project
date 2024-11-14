const mongoose = require('mongoose');

// Define the RatingAndReview schema
const ratingAndReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User schema
    required: true
  },
  course:{
    type:mongoose.Schema.Types.ObjectId,
    required:true,
    ref:"Course",
    index:true
  },
  rating: {
    type: Number,
    required: true,
    min: 1, // Minimum rating value
    max: 5  // Maximum rating value
  },
  review: {
    type: String,
    maxlength: 500, // Optional limit on the length of the review
    trim: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt timestamps
});

// Export the RatingAndReview model
module.exports = mongoose.model('RatingAndReview', ratingAndReviewSchema);
