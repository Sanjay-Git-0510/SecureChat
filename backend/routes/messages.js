const express = require('express');
const router = express.Router();
const { getDirectMessages, getRoomMessages, deleteMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.get('/direct/:userId', protect, getDirectMessages);
router.get('/room/:roomId', protect, getRoomMessages);
router.delete('/:id', protect, deleteMessage);

module.exports = router;