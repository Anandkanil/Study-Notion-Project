// One student's go at a section quiz. Kept so we can show their best score.
const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    passed: { type: Boolean, default: false },
    answers: [Number],
  },
  { timestamps: true }
);

attemptSchema.index({ user: 1, quiz: 1, createdAt: -1 });

module.exports = mongoose.model('QuizAttempt', attemptSchema);
