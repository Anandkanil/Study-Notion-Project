// A guided path: an ordered list of courses that build on each other, set up by an admin.
const mongoose = require('mongoose');

const pathSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, maxlength: 90 },
    summary: { type: String, default: '', maxlength: 300 },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Path', pathSchema);
