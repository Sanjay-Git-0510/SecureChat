const Message = require('../models/Message');
const User    = require('../models/User');
const jwt     = require('jsonwebtoken');

// Map: userId(string) -> socketId
const onlineUsers = new Map();

module.exports = (io) => {

  // ── JWT auth middleware for every socket ──
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.user;
    const uid  = String(user._id);

    console.log(`✅ ${user.username} connected [${socket.id}]`);

    // Register online
    onlineUsers.set(uid, socket.id);
    await User.findByIdAndUpdate(uid, { isOnline: true, lastSeen: new Date() });

    // Tell EVERYONE about this new online user
    io.emit('user:online',  { userId: uid });
    // Push full online list so every client refreshes immediately
    io.emit('online:users', Array.from(onlineUsers.keys()));

    // Join private notification channel
    socket.join(`user:${uid}`);

    // ── Client asks for current online list (called on mount) ──
    socket.on('get:online_users', () => {
      socket.emit('online:users', Array.from(onlineUsers.keys()));
    });

    // ── Join a room channel ──
    socket.on('room:join', (roomId) => {
      socket.join(`room:${roomId}`);
    });

    socket.on('room:leave', (roomId) => {
      socket.leave(`room:${roomId}`);
    });

    // ── Direct message ──
    socket.on('message:direct', async ({ receiverId, content }) => {
      try {
        const msg = await Message.create({
          sender: uid, receiver: receiverId, content: content.trim(),
        });
        await msg.populate('sender',   'username avatar');
        await msg.populate('receiver', 'username avatar');

        // Send to receiver if online
        const recvSocket = onlineUsers.get(String(receiverId));
        if (recvSocket) io.to(recvSocket).emit('message:new', msg);
        // Echo to sender
        socket.emit('message:new', msg);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Room message ──
    socket.on('message:room', async ({ roomId, content }) => {
      try {
        const msg = await Message.create({
          sender: uid, room: roomId, content: content.trim(),
        });
        await msg.populate('sender', 'username avatar');
        // Broadcast to all members in the room socket channel
        io.to(`room:${roomId}`).emit('message:new', msg);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Typing ──
    socket.on('typing:start', ({ to, isRoom }) => {
      const payload = { userId: uid, username: user.username };
      if (isRoom) {
        socket.to(`room:${to}`).emit('typing:start', payload);
      } else {
        const s = onlineUsers.get(String(to));
        if (s) io.to(s).emit('typing:start', payload);
      }
    });

    socket.on('typing:stop', ({ to, isRoom }) => {
      if (isRoom) {
        socket.to(`room:${to}`).emit('typing:stop', { userId: uid });
      } else {
        const s = onlineUsers.get(String(to));
        if (s) io.to(s).emit('typing:stop', { userId: uid });
      }
    });

    // ── Disconnect ──
    socket.on('disconnect', async () => {
      console.log(`❌ ${user.username} disconnected`);
      onlineUsers.delete(uid);
      await User.findByIdAndUpdate(uid, { isOnline: false, lastSeen: new Date() });
      io.emit('user:offline',  { userId: uid });
      io.emit('online:users',  Array.from(onlineUsers.keys()));
    });
  });
};