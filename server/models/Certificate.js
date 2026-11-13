const mongoose = require('mongoose');

// A course-completion certificate. Names are kept as they were when it was issued,
// so the public verify page shows what the certificate says even if a name changes.
const certificateSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g. SN-7K4Q-2M9X, shown on the certificate
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  learnerName: { type: String, required: true },
  courseName: { type: String, required: true },
  instructorName: String,
  lessons: Number,
  totalDuration: String,
  issuedAt: { type: Date, default: Date.now },
}, { timestamps: true });

certificateSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', certificateSchema);
