const Notification = require('../models/Notification');

const isId = (id) => /^[a-f0-9]{24}$/i.test(String(id || ''));
const LIMIT = 30;

// GET /notifications: the latest 30 and how many are unread
exports.list = async (req, res) => {
  try {
    const [items, unread] = await Promise.all([
      Notification.find({ user: req.user.userId }).sort({ createdAt: -1 }).limit(LIMIT).select('type title body link read createdAt').lean(),
      Notification.countDocuments({ user: req.user.userId, read: false }),
    ]);
    return res.status(200).json({ success: true, data: { items, unread } });
  } catch (error) {
    console.error('notifications.list:', error.message);
    return res.status(500).json({ success: false, message: "Your notifications couldn't load." });
  }
};

// PATCH /notifications/:id/read
exports.markRead = async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid notification.' });
  try {
    await Notification.updateOne({ _id: req.params.id, user: req.user.userId }, { read: true });
    const unread = await Notification.countDocuments({ user: req.user.userId, read: false });
    return res.status(200).json({ success: true, data: { unread } });
  } catch (error) {
    console.error('notifications.markRead:', error.message);
    return res.status(500).json({ success: false, message: "Couldn't update the notification." });
  }
};

// POST /notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.userId, read: false }, { read: true });
    return res.status(200).json({ success: true, message: 'All caught up', data: { unread: 0 } });
  } catch (error) {
    console.error('notifications.markAllRead:', error.message);
    return res.status(500).json({ success: false, message: "Couldn't update your notifications." });
  }
};
