const mongoose = require('mongoose');

// A discount code for one course, created by that course's instructor.
const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, trim: true, match: /^[A-Z0-9_-]{3,20}$/ },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  percentOff: { type: Number, required: true, min: 1, max: 90 },
  expiresAt: { type: Date, default: null },  // null = never
  maxUses: { type: Number, default: null, min: 1 }, // null = unlimited
  uses: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

// The same code can exist on different courses, but only once per course
couponSchema.index({ code: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Coupon', couponSchema);
