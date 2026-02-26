'use strict';

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const dotenv     = require('dotenv');

dotenv.config();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || 'http://localhost:3000',
    methods:     ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// ── Register ALL models BEFORE anything else touches them ──
const User    = require('./models/User');
const Room    = require('./models/Room');
const Message = require('./models/Message');

// Quick sanity check — will throw loud errors on startup if models broke
console.log('Models loaded:', !!User.find, !!Room.find, !!Message.find);

// ── Routes ──
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/rooms',    require('./routes/rooms'));
app.use('/api/admin',    require('./routes/admin'));

// ── Socket.IO ──
require('./socket/socketHandler')(io);

app.get('/', (_req, res) => res.json({ message: 'NexusChat API 🚀' }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server on port ${process.env.PORT || 5000}`)
    );
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });