const Section = require('../models/Section');
const Course = require('../models/Course');

exports.createSection = async function (req, res) {
    // Fetch the request body data
    const { courseId, sectionName } = req.body;

    try {
        // Validate required fields
        if (!courseId || !sectionName) {
            return res.status(400).json({
                success: false,
                message: "Both Course ID and Section Name are mandatory."
            });
        }

        // Check if the course exists
        const courseExists = await Course.findById(courseId);
        if (!courseExists) {
            return res.status(404).json({
                success: false,
                message: "Course not found."
            });
        }

        // Create a new section
        const newSection = new Section({
            sectionName,
            subSection: [] // Initial empty array for subsections
        });

        // Save the new section
        const savedSection = await newSection.save();

        // Add the new section to the course's courseContent array
        await Course.updateOne(
            { _id: courseId },
            { $push: { courseContent: savedSection._id } }
        );

        // Respond with success
        return res.status(201).json({
            success: true,
            message: "Section created successfully.",
            section: savedSection
        });

    } catch (error) {
        console.error("Section creation failed: ", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while creating the section."
        });
    }
};

exports.updateSection = async function (req, res) {
    const { sectionName, sectionId } = req.body;

    try {
        // Validate required fields
        if (!sectionId || !sectionName) {
            return res.status(400).json({
                success: false,
                message: "Both Section ID and Section Name are mandatory."
            });
        }

        // Check if the section exists
        const sectionExists = await Section.findById(sectionId);
        if (!sectionExists) {
            return res.status(404).json({ 
                success: false, 
                message: "Section not found." 
            });
        }

        // Update the section's name
        sectionExists.sectionName = sectionName;
        await sectionExists.save();

        return res.status(200).json({
            success: true,
            message: "Section has been updated successfully.",
            section: sectionExists
        });
    } catch (error) {
        console.error("Error updating section:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating the section."
        });
    }
};
// DELETE a section
exports.deleteSection = async (req, res) => {
	try {
		const { sectionId,courseId } = req.body;
		await Section.findByIdAndDelete(sectionId);
        await Course.findByIdAndUpdate(courseId,{$pull:{courseContent:sectionId}},{new:true});
		res.status(200).json({
			success: true,
			message: "Section deleted",
		});
	} catch (error) {
		console.error("Error deleting section:", error);
		res.status(500).json({
			success: false,
			message: "Internal server error",
		});
	}
};
