const User = require('../models/User');
const Message = require('../models/Message');
const Room = require('../models/Room');

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalMessages, totalRooms, onlineUsers] = await Promise.all([
      User.countDocuments(),
      Message.countDocuments({ isDeleted: false }),
      Room.countDocuments(),
      User.countDocuments({ isOnline: true }),
    ]);
    res.json({ totalUsers, totalMessages, totalRooms, onlineUsers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate('createdBy', 'username')
      .populate('members', 'username')
      .sort({ createdAt: -1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    await Message.deleteMany({ room: req.params.id });
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRecentMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};