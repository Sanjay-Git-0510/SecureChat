'use strict';

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    room:      { type: mongoose.Schema.Types.ObjectId, ref: 'Room', default: null },
    content:   { type: String, required: true, trim: true },
    type:      { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    readBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;