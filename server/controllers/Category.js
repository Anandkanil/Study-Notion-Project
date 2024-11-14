const Category = require('../models/Category');
const Course = require('../models/Course');

// Function to create a Category
const createCategory = async function (req, res) {
    const { name, description } = req.body;

    try {
        // Validate input fields
        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: "Both name and description are required."
            });
        }

        // Check if the Category already exists in the database
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Category with this name already exists."
            });
        }

        // Create a new Category entry
        const newCategory = new Category({ name, description });
        await newCategory.save();

        // Respond with success
        return res.status(201).json({
            success: true,
            message: "Category successfully created."
        });
    } catch (error) {
        console.error("Category creation failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred while creating the Category."
        });
    }
};

// Function to get all Categories
const showAllCategories = async function (req, res) {
    try {
        // Find all Categories
        const allCategories = await Category.find();

        // Check if there are no Categories
        if (allCategories.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No Categories found."
            });
        }

        // Respond with the list of Categories
        return res.status(200).json({
            success: true,
            allCategories
        });
    } catch (error) {
        console.error("Error fetching Categories:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching Categories."
        });
    }
};

// Function to get details of a specific category along with associated courses
const categoryPageDetails = async (req, res) => {
    try {
        // Get categoryId from request body
        const { categoryId } = req.body;

        // Validate categoryId
        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: "categoryId is required."
            });
        }

        // Find the category by ID
        const category = await Category.findById(categoryId).populate('courses');

        // Check if the category exists
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found."
            });
        }
        //get the Categories other that the current category
        const differentCategories=Category.find({_id:{$ne:categoryId}}).populate('courses');


        // Find all courses associated with this category
        const courses = await Course.find({ category: categoryId })
            .populate('instructor', 'username email')
            .select('title description price instructor');

        // Respond with category details and associated courses
        return res.status(200).json({
            success: true,
            category,
            courses,
            message: "Category details retrieved successfully."
        });
    } catch (error) {
        console.error("Error fetching category details:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching category details. Please try again later."
        });
    }
};


// Export both functions
module.exports = { createCategory, showAllCategories, categoryPageDetails };