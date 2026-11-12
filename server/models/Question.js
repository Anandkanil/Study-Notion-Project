const mongoose = require('mongoose');

// A question under a lesson, visible to everyone in the course, with answers.
const answerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  byInstructor: { type: Boolean, default: false },
}, { timestamps: true });

const questionSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'SubSection', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  answers: [answerSchema],
  answeredByInstructor: { type: Boolean, default: false },
  resolved: { type: Boolean, default: false },
}, { timestamps: true });

questionSchema.index({ course: 1, lesson: 1, createdAt: -1 });

module.exports = mongoose.model('Question', questionSchema);
