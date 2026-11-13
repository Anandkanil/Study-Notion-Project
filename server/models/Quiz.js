// A multiple-choice quiz at the end of a course section, written by the course's instructor.
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 300 },
    options: [{ type: String, maxlength: 200 }],
    answer: { type: Number, required: true }, // index into options
    explain: { type: String, default: '', maxlength: 500 },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, unique: true },
    questions: [questionSchema],
    passPercent: { type: Number, default: 60, min: 40, max: 100 },
  },
  { timestamps: true }
);

quizSchema.index({ course: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
