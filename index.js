// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const connectDB = require('./config/db');
// const authRoutes = require('./routes/authRoutes');
// const messageRoutes = require('./routes/messageRoutes');
// const http = require('http');
// const { Server } = require('socket.io');
// const Message = require('./models/Message');
// const User = require('./models/User'); // Assuming you have a User model
// const uploadRoutes = require('./routes/uploadRoutes')
// dotenv.config();
// connectDB();



// const app = express();
// const server = http.createServer(app);

// app.use(express.static('assets')); // Serve static files, including default profile picture

// const io = new Server(server, {
//   cors: {
//     origin: 'https://talkcy.netlify.app', // In production, replace '*' with your frontend URL for security
//     methods: ["GET", "POST"],
//   },
// });

// app.use(cors());
// app.use(express.json());

// app.use((req, res, next) => {
//   req.io = io; // Attach io instance to request object
//   next();
// });


// app.use('/api/auth', authRoutes);
// app.use('/api', messageRoutes);
// app.use('/api/uploads',uploadRoutes);
// app.use('/uploads', express.static('uploads'));
// app.use('/assets', express.static('assets'));
// // Store connected users' socket IDs
// const users = {};



// // Listen for connections
// io.on('connection', (socket) => {
//   console.log('A user connected:', socket.id);

//   // Register a user when they connect
//   socket.on('registerUser', async (userId) => {
//     if (!users[userId]) {
//       users[userId] = [];
//     }
//     users[userId].push(socket.id);
//     console.log(`User ${userId} connected with socket ID: ${socket.id}`);

//     // When a user reconnects, deliver any undelivered messages
//     const undeliveredMessages = await Message.find({
//       receiver: userId,
//       delivered: false,
//     });

//     undeliveredMessages.forEach((msg) => {
//       socket.emit('receiveMessage', msg); // Deliver undelivered messages
//       msg.delivered = true;
//       msg.save(); // Mark message as delivered
//     });
//   });

//   // Handle message sending
//   socket.on('sendMessage', async (messageData) => {
//     try {
//       // Save the message to the database
//       const newMessage = new Message({
//         sender: messageData.senderId,
//         receiver: messageData.receiverId,
//         content: messageData.content,
//       });
//       await newMessage.save();

//       // Broadcast the message to all connected sockets of the recipient
//       const recipientSocketIds = users[messageData.receiverId];
//       if (recipientSocketIds && recipientSocketIds.length > 0) {
//         recipientSocketIds.forEach((socketId) => {
//           io.to(socketId).emit('receiveMessage', newMessage);
//         });
//       } else {
//         console.log(`Recipient ${messageData.receiverId} is offline. Message saved for later.`);
//       }
//     } catch (error) {
//       console.error('Error sending message:', error);
//       socket.emit('messageError', { error: 'Could not send message, please try again' });
//     }
//   });

//   // Handle disconnect
//   socket.on('disconnect', () => {
//     console.log('A user disconnected:', socket.id);

//     // Remove the disconnected socket ID from the user's list of connections
//     for (const [userId, socketIds] of Object.entries(users)) {
//       users[userId] = socketIds.filter((id) => id !== socket.id);
//       if (users[userId].length === 0) {
//         delete users[userId];
//         console.log(`User ${userId} disconnected from all devices`);
//       }
//     }
//   });
// });

// // Start the server
// const PORT = 5000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


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
const User = require('./models/User');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['https://talkcy.netlify.app', 'http://localhost:5173'], // ✅ allow production and local dev
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Express Middleware
app.use(cors({
  origin: ['https://talkcy.netlify.app', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());
app.use(express.static('assets')); // Serve static files (e.g., profile pictures)
app.use('/uploads', express.static('uploads'));
app.use('/assets', express.static('assets'));

// Socket instance accessible in routes if needed
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);
app.use('/api/uploads', uploadRoutes);

// In-memory storage of userID to socketIDs
const users = {};

// Socket.IO logic
io.on('connection', (socket) => {
  console.log('🔗 A user connected:', socket.id);

  // Register user on connection
  socket.on('registerUser', async (userId) => {
    if (!users[userId]) {
      users[userId] = [];
    }
    users[userId].push(socket.id);
    console.log(`✅ Registered user ${userId} with socket ${socket.id}`);

    try {
      const undeliveredMessages = await Message.find({
        receiver: userId,
        delivered: false,
      });

      // Emit and mark messages as delivered safely
      for (const msg of undeliveredMessages) {
        socket.emit('receiveMessage', msg);
        msg.delivered = true;
        await msg.save(); // ✅ awaited to avoid duplicates
      }
    } catch (error) {
      console.error('❌ Error delivering undelivered messages:', error);
    }
  });

  // Handle message sending
  socket.on('sendMessage', async (messageData) => {
    try {
      const newMessage = new Message({
        sender: messageData.senderId,
        receiver: messageData.receiverId,
        content: messageData.content,
        delivered: false,
      });
      await newMessage.save();

      const recipientSocketIds = users[messageData.receiverId];

      if (recipientSocketIds && recipientSocketIds.length > 0) {
        recipientSocketIds.forEach((socketId) => {
          io.to(socketId).emit('receiveMessage', newMessage);
        });

        // Mark as delivered immediately since recipient is online
        newMessage.delivered = true;
        await newMessage.save();
      } else {
        console.log(`📭 Recipient ${messageData.receiverId} is offline`);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('messageError', { error: 'Could not send message, please try again' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('🔌 A user disconnected:', socket.id);

    for (const [userId, socketIds] of Object.entries(users)) {
      users[userId] = socketIds.filter((id) => id !== socket.id);
      if (users[userId].length === 0) {
        delete users[userId];
        console.log(`🛑 User ${userId} removed from online list`);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

