const mongoose = require('mongoose');

// Who did what in the admin panel, and when. Written by server/utils/adminLog.js.
const adminLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g. "course.approve"
  summary: { type: String, required: true, maxlength: 300 }, // plain sentence shown in the log
  target: { kind: String, id: String },
}, { timestamps: true });

adminLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
