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
                message: "Both name and description are required.",
            });
        }

        // Check if the Category already exists in the database
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: "Category with this name already exists.",
            });
        }

        // Create a new Category entry
        const newCategory = new Category({ name, description });
        await newCategory.save();

        // Respond with success
        return res.status(201).json({
            success: true,
            message: "Category successfully created.",
            data: newCategory,
        });
    } catch (error) {
        console.error("Category creation failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred while creating the category.",
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
                message: "No categories found.",
            });
        }

        // Respond with the list of Categories
        return res.status(200).json({
            success: true,
            data: allCategories,
        });
    } catch (error) {
        console.error("Error fetching categories:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching categories.",
        });
    }
};

// Function to get category page details
const categoryPageDetails = async (req, res) => {
    try {
        const { categoryId } = req.body;

        if (!categoryId) {
            return res.status(400).json({
                success: false,
                message: "Category ID is required.",
            });
        }

        console.log("PRINTING CATEGORY ID: ", categoryId);

        // Get courses for the specified category
        const selectedCategory = await Category.findById(categoryId)
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate: { path: "ratingAndReviews" },
            })
            .exec();

        // Handle the case when the category is not found
        if (!selectedCategory) {
            console.log("Category not found.");
            return res.status(404).json({
                success: false,
                message: "Category not found.",
            });
        }

        // Handle the case when there are no courses
        if (!selectedCategory.courses || selectedCategory.courses.length === 0) {
            console.log("No courses found for the selected category.");
            return res.status(404).json({
                success: false,
                message: "No courses found for the selected category.",
            });
        }

        // Get courses for a random other category
        const categoriesExceptSelected = await Category.find({
            _id: { $ne: categoryId },
        });

        let differentCategory = null;

        if (categoriesExceptSelected.length > 0) {
            const randomIndex = Math.floor(Math.random() * categoriesExceptSelected.length);
            differentCategory = await Category.findById(categoriesExceptSelected[randomIndex]._id)
                .populate({
                    path: "courses",
                    match: { status: "Published" },
                })
                .exec();
        }

        // Get top-selling courses across all categories
        const allCategories = await Category.find()
            .populate({
                path: "courses",
                match: { status: "Published" },
                populate: { path: "instructor" },
            })
            .exec();

        const allCourses = allCategories.flatMap((category) => category.courses);
        const mostSellingCourses = allCourses
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 10);

        return res.status(200).json({
            success: true,
            data: {
                selectedCategory,
                differentCategory,
                mostSellingCourses,
            },
        });
    } catch (error) {
        console.error("Error fetching category page details:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};

// Export the functions
module.exports = { createCategory, showAllCategories, categoryPageDetails };
