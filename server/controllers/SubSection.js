const SubSection = require('../models/SubSection');
const Section = require('../models/Section');
const { uploadImageToCloudinary } = require('../utils/imageUploader');
require('dotenv').config();

exports.createSubSection = async function (req, res) {
    const { sectionId, title, timeDuration, description } = req.body;
    const video = req.files?.video;

    // Validate required fields
    if (!sectionId || !title || !timeDuration || !description || !video) {
        return res.status(400).json({
            success: false,
            message: "All required fields (sectionId, title, timeDuration, description, and video) must be provided."
        });
    }

    try {
        // Check if the section exists
        const sectionExists = await Section.findById(sectionId);
        if (!sectionExists) {
            return res.status(404).json({
                success: false,
                message: "Section not found for the provided sectionId."
            });
        }

        // Upload video to Cloudinary
        const videoUploadResponse = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);
        const videoUrl = videoUploadResponse.secure_url;

        // Create a new sub-section document
        const newSubSection = new SubSection({
            title,
            timeDuration,
            description,
            videoUrl
        });

        // Save the sub-section to the database
        const savedSubSection = await newSubSection.save();

        // Add the sub-section to the section's subSection array
        await Section.findByIdAndUpdate(
            sectionId,
            { $push: { subSection: savedSubSection._id } },
            { new: true }
        );

        // Respond with success
        return res.status(201).json({
            success: true,
            message: "Sub-section created successfully.",
            subSection: savedSubSection
        });
    } catch (error) {
        console.error("Error creating sub-section:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while creating the sub-section."
        });
    }
};

//Update Sub-Section
exports.updateSubSection = async function (req, res) {
    const { subSectionId, title, timeDuration, description } = req.body;
    const video = req.files?.video;

    // Validate subSectionId
    if (!subSectionId) {
        return res.status(400).json({
            success: false,
            message: "subSectionId is required."
        });
    }

    try {
        // Check if the sub-section exists
        const subSectionExists = await SubSection.findById(subSectionId);
        if (!subSectionExists) {
            return res.status(404).json({
                success: false,
                message: "Sub-section not found for the provided ID."
            });
        }

        // Prepare update object
        const updateData = {};
        if (title) updateData.title = title;
        if (timeDuration) updateData.timeDuration = timeDuration;
        if (description) updateData.description = description;

        // Upload new video if provided
        if (video) {
            const videoUploadResponse = await uploadImageToCloudinary(video, process.env.FOLDER_NAME);
            updateData.videoUrl = videoUploadResponse.secure_url;
        }

        // Update the sub-section document
        const updatedSubSection = await SubSection.findByIdAndUpdate(subSectionId, updateData, {
            new: true,
            runValidators: true
        });

        // Respond with success
        return res.status(200).json({
            success: true,
            message: "Sub-section updated successfully.",
            subSection: updatedSubSection
        });
    } catch (error) {
        console.error("Error updating sub-section:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating the sub-section."
        });
    }
};

//Delete Sub-section from Section's sub-section array
exports.deleteSubSection = async function (req, res) {
    const { subSectionId, sectionId } = req.body;

    // Validate required fields
    if (!subSectionId || !sectionId) {
        return res.status(400).json({
            success: false,
            message: "Both subSectionId and sectionId are required."
        });
    }

    try {
        // Check if the sub-section exists
        const subSectionExists = await SubSection.findById(subSectionId);
        if (!subSectionExists) {
            return res.status(404).json({
                success: false,
                message: "Sub-section not found for the provided ID."
            });
        }

        // Delete the sub-section
        await SubSection.findByIdAndDelete(subSectionId);

        // Remove the sub-section ID from the parent section's subSection array
        await Section.findByIdAndUpdate(
            sectionId,
            { $pull: { subSection: subSectionId } },
            { new: true }
        );

        // Respond with success
        return res.status(200).json({
            success: true,
            message: "Sub-section deleted successfully."
        });
    } catch (error) {
        console.error("Error deleting sub-section:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while deleting the sub-section."
        });
    }
};
