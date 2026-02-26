'use strict';

const mongoose = require('mongoose');
const Room     = require('../models/Room');

// ── Create room ──
exports.createRoom = async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ message: 'Room name is required' });

    const exists = await Room.findOne({ name: name.trim() });
    if (exists)
      return res.status(400).json({ message: `Room "${name.trim()}" already exists` });

    const room = new Room({
      name:        name.trim(),
      description: (description || '').trim(),
      isPrivate:   !!isPrivate,
      createdBy:   req.user._id,
      members:     [req.user._id],
    });

    await room.save();
    await room.populate('createdBy', 'username avatar');
    await room.populate('members',   'username avatar isOnline');

    return res.status(201).json(room);
  } catch (err) {
    console.error('createRoom error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ── Get all public rooms ──
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room
      .find({ isPrivate: false })
      .populate('createdBy', 'username avatar')
      .populate('members',   'username avatar isOnline')
      .sort({ createdAt: -1 });

    return res.json(rooms);
  } catch (err) {
    console.error('getRooms error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ── Join room ──
exports.joinRoom = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: 'Invalid room ID' });

    const room = await Room
      .findByIdAndUpdate(id, { $addToSet: { members: req.user._id } }, { new: true })
      .populate('createdBy', 'username avatar')
      .populate('members',   'username avatar isOnline');

    if (!room)
      return res.status(404).json({ message: 'Room not found' });

    return res.json(room);
  } catch (err) {
    console.error('joinRoom error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ── Leave room ──
exports.leaveRoom = async (req, res) => {
  try {
    const room = await Room
      .findByIdAndUpdate(req.params.id, { $pull: { members: req.user._id } }, { new: true })
      .populate('members', 'username avatar isOnline');

    if (!room)
      return res.status(404).json({ message: 'Room not found' });

    return res.json(room);
  } catch (err) {
    console.error('leaveRoom error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};