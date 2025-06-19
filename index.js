/*const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/Message');
const User = require('./models/User'); // Assuming you have a User model
const uploadRoutes = require('./routes/uploadRoutes')
dotenv.config();
connectDB();



const app = express();
const server = http.createServer(app);

app.use(express.static('assets')); // Serve static files, including default profile picture

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // In production, replace '*' with your frontend URL for security
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io; // Attach io instance to request object
  next();
});


app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);
app.use('/api/uploads',uploadRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/assets', express.static('assets'));
// Store connected users' socket IDs
const users = {};



// Listen for connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Register a user when they connect
  socket.on('registerUser', async (userId) => {
    if (!users[userId]) {
      users[userId] = [];
    }
    users[userId].push(socket.id);
    console.log(`User ${userId} connected with socket ID: ${socket.id}`);

    // When a user reconnects, deliver any undelivered messages
    const undeliveredMessages = await Message.find({
      receiver: userId,
      delivered: false,
    });

    undeliveredMessages.forEach((msg) => {
      socket.emit('receiveMessage', msg); // Deliver undelivered messages
      msg.delivered = true;
      msg.save(); // Mark message as delivered
    });
  });

  // Handle message sending
  socket.on('sendMessage', async (messageData) => {
    try {
      // Save the message to the database
      const newMessage = new Message({
        sender: messageData.senderId,
        receiver: messageData.receiverId,
        content: messageData.content,
      });
      await newMessage.save();

      // Broadcast the message to all connected sockets of the recipient
      const recipientSocketIds = users[messageData.receiverId];
      if (recipientSocketIds && recipientSocketIds.length > 0) {
        recipientSocketIds.forEach((socketId) => {
          io.to(socketId).emit('receiveMessage', newMessage);
        });
      } else {
        console.log(`Recipient ${messageData.receiverId} is offline. Message saved for later.`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('messageError', { error: 'Could not send message, please try again' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);

    // Remove the disconnected socket ID from the user's list of connections
    for (const [userId, socketIds] of Object.entries(users)) {
      users[userId] = socketIds.filter((id) => id !== socket.id);
      if (users[userId].length === 0) {
        delete users[userId];
        console.log(`User ${userId} disconnected from all devices`);
      }
    }
  });
});

// Start the server
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});*/



const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/Message');
const jwt = require('jsonwebtoken');
dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Store socket mapping
const users = {};

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/assets', express.static('assets'));

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('🔗 Socket connected:', socket.id);

  socket.on('registerUser', async (userId) => {
    if (!users[userId]) users[userId] = [];
    users[userId].push(socket.id);
    console.log(`🧑 User ${userId} registered with socket ${socket.id}`);

    const undelivered = await Message.find({ receiver: userId, delivered: false });
    undelivered.forEach((msg) => {
      socket.emit('receiveMessage', msg);
      msg.delivered = true;
      msg.save();
    });
  });

  socket.on('sendMessage', async (msgData) => {
    try {
      const newMsg = new Message({
        sender: msgData.senderId,
        receiver: msgData.receiverId,
        content: msgData.content,
        timestamp: new Date(),
      });
      await newMsg.save();

      const receiverSockets = users[msgData.receiverId];
      if (receiverSockets && receiverSockets.length) {
        receiverSockets.forEach((id) => {
          io.to(id).emit('receiveMessage', newMsg);
        });
      } else {
        console.log(`📭 Receiver ${msgData.receiverId} is offline`);
      }
    } catch (err) {
      console.error('Send error:', err);
      socket.emit('messageError', { error: 'Send failed' });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected:', socket.id);
    for (const [uid, sockets] of Object.entries(users)) {
      users[uid] = sockets.filter((id) => id !== socket.id);
      if (users[uid].length === 0) {
        delete users[uid];
        console.log(`🧑‍🦱 User ${uid} removed`);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

