// Creates in-app notifications. Never throws: a notice must not undo the action that caused it.
const Notification = require('../models/Notification');

const clip = (s, n) => String(s || '').slice(0, n);

/**
 * notify(userIds, { type, title, body, link })
 * userIds: one id or a list. Duplicate ids get one notice.
 */
module.exports = async function notify(userIds, { type, title, body = '', link = '' }) {
  try {
    const ids = [...new Set([].concat(userIds || []).filter(Boolean).map(String))];
    if (!ids.length || !type || !title) return 0;
    const docs = ids.map((user) => ({ user, type, title: clip(title, 160), body: clip(body, 300), link: clip(link, 300) }));
    await Notification.insertMany(docs, { ordered: false });
    return docs.length;
  } catch (error) {
    console.error('Notify:', error.message);
    return 0;
  }
};
