const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/Message');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // Change '*' to your frontend URL when deploying for security
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);

// Store connected users' socket IDs
const users = {};

// Listen for connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Register a user when they connect
  socket.on('registerUser', (userId) => {
    users[userId] = socket.id;
    console.log(`User ${userId} is now connected with socket ID: ${socket.id}`);
  });

  // Handle message sending
  socket.on('sendMessage', async (messageData) => {
    try {
      // Save the message to the database
      const newMessage = new Message(messageData);
      await newMessage.save();

      // Broadcast the message to the recipient if they are connected
      const recipientSocketId = users[messageData.recipient];
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receiveMessage', messageData); // Use io.to() for clarity
      } else {
        console.log(`Recipient ${messageData.recipient} is not connected`);
      }
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('messageError', { error: 'Could not send message, please try again' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);

    // Remove the user from the `users` object
    for (const [userId, socketId] of Object.entries(users)) {
      if (socketId === socket.id) {
        delete users[userId];
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Start the server
const PORT =  5000; 
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});