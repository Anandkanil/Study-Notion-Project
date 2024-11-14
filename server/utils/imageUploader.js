const cloudinary = require('cloudinary').v2;

exports.uploadImageToCloudinary = async (file, folder, height, quality) => {
    const options = {
        folder,
        resource_type: 'auto'
    };

    // Optional parameters for resizing and quality control
    if (height) options.height = height;
    if (quality) options.quality = quality;

    try {
        // Upload the image to Cloudinary
        const result = await cloudinary.uploader.upload(file.tempFilePath, options);

        // Return the upload response with URL and public ID
        return {
            success: true,
            url: result.secure_url,
            public_id: result.public_id
        };
    } catch (error) {
        console.error("Error uploading image to Cloudinary:", error.message);
        return {
            success: false,
            message: "Image upload failed. Please try again.",
            error: error.message
        };
    }
};
