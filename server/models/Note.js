const mongoose = require('mongoose');

// A student's private note on a lesson, pinned to a moment in the video.
const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'SubSection', required: true },
  at: { type: Number, default: 0, min: 0 }, // seconds into the video
  text: { type: String, required: true, trim: true, maxlength: 1000 },
}, { timestamps: true });

noteSchema.index({ user: 1, course: 1, lesson: 1 });

module.exports = mongoose.model('Note', noteSchema);
