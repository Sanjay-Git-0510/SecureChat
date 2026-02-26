const express = require('express');
const router = express.Router();
const { createRoom, getRooms, joinRoom, leaveRoom } = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getRooms);
router.post('/', protect, createRoom);
router.post('/:id/join', protect, joinRoom);
router.post('/:id/leave', protect, leaveRoom);

module.exports = router;