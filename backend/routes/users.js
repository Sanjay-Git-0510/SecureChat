const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllUsers);
router.get('/:id', protect, getUserById);
router.put('/profile', protect, updateProfile);

module.exports = router;