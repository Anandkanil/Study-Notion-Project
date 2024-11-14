const mongoose = require('mongoose');

// Define the Course schema
const courseSchema = new mongoose.Schema({
    courseName: {
        type: String,
        trim: true,
        required: true
    },
    courseDescription: {
        type: String,
        trim: true,
        maxlength: 1000, // Optional limit for description length
        required: true
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User schema
        required: true
    },
    whatYouWillLearn: {
        type: [String], // Array of strings describing learning outcomes
        required: true
    },
    courseContent: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Section' // Reference to the Section schema
        }
    ],
    ratingAndReviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RatingAndReview' // Reference to the RatingAndReview schema
        }
    ],
    price: {
        type: Number,
        required: true,
        min: 0 // Ensures price is non-negative
    },
    thumbnail: {
        type: String,
        required: true
    },

    tags:{
        type:[String],
        required:true
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category"
    },
    studentsEnrolled: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User' // Reference to the User schema for enrolled students
        }
    ],
    instructions:{
        type:[String]
    },
    status:{
        type:String,
        enum:["Draft","Published"]
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt timestamps
});

// Export the Course model
module.exports = mongoose.model('Course', courseSchema);
