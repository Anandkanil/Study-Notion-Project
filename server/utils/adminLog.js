// Records an admin action. Never throws: a logging problem must not undo the action.
const AdminLog = require('../models/AdminLog');

module.exports = async function adminLog(req, action, summary, target = {}) {
  try {
    await AdminLog.create({ admin: req.user.userId, action, summary: String(summary).slice(0, 300), target });
  } catch (error) {
    console.error('Admin log:', error.message);
  }
};
