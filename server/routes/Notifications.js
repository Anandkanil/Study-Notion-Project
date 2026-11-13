const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const { list, markRead, markAllRead } = require('../controllers/Notifications');

router.get('/', auth, list);
router.patch('/:id/read', auth, markRead);
router.post('/read-all', auth, markAllRead);

module.exports = router;
