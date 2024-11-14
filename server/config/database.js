const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/mydatabase';

// Function to connect to the database
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URL);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1); // Exit the process with failure if unable to connect
  }
};

module.exports = connectDB;