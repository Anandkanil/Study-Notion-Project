// An in-app notice for one user, shown under the bell in the navbar.
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // answer | announcement | course-review | refund | enrolled | new-student | completed | review-reply
    type: { type: String, required: true, maxlength: 40 },
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, default: '', maxlength: 300 },
    link: { type: String, default: '', maxlength: 300 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
// Old notices clear themselves after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
