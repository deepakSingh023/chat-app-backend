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
const { cloudinary } = require('./cloudinary');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['https://talkcy.netlify.app', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

app.use(cors({
    origin: ['https://talkcy.netlify.app', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api', messageRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/users', authRoutes)

// === SOCKET.IO ===
const users = {}; // { userId: [socketId, ...] }
const userRooms = {}; // { socketId: [roomId, ...] }

io.on('connection', (socket) => {
    console.log('🔗 Connected:', socket.id);

    // Register user
    socket.on('registerUser', async (userId) => {
        users[userId] = users[userId] || [];
        users[userId].push(socket.id);
        socket.userId = userId;
        console.log(`✅ Registered user ${userId} with socket ${socket.id}`);
        
        // Notify all friends that this user came online
        broadcastUserStatus(userId, true);
    });

    // Join chat room
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        userRooms[socket.id] = userRooms[socket.id] || [];
        if (!userRooms[socket.id].includes(roomId)) {
            userRooms[socket.id].push(roomId);
        }
        console.log(`👥 Socket ${socket.id} joined room ${roomId}`);
    });

    // Leave chat room
    socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
        if (userRooms[socket.id]) {
            userRooms[socket.id] = userRooms[socket.id].filter(room => room !== roomId);
            if (userRooms[socket.id].length === 0) {
                delete userRooms[socket.id];
            }
        }
        console.log(`👋 Socket ${socket.id} left room ${roomId}`);
    });

    // Check if user is online
    socket.on('checkUserOnline', (userId) => {
        const isOnline = !!(users[userId] && users[userId].length > 0);
        socket.emit('userOnlineStatus', { userId, isOnline });
        console.log(`🔍 Checking online status for ${userId}: ${isOnline}`);
    });

    // Legacy support for old frontend
    socket.on('userOnline', (friendId) => {
        const isOnline = !!(users[friendId] && users[friendId].length > 0);
        socket.emit('onlineStatus', isOnline);
    });

    // Handle message sending
    socket.on('sendMessage', async (messageData) => {
        try {
            console.log('📨 Received message data:', messageData);

            // For messages that already exist (sent via API), just broadcast them
            if (messageData._id) {
                // This is a message that was already saved via the API route
                // We just need to broadcast it to the room
                
                const messageToSend = {
                    ...messageData,
                    sender: messageData.sender || { _id: messageData.sender, username: 'User' },
                    receiver: messageData.receiver || { _id: messageData.receiver, username: 'User' }
                };

                if (messageData.roomId) {
                    // Send to room (excluding sender)
                    socket.to(messageData.roomId).emit('receiveMessage', messageToSend);
                    console.log(`📨 Broadcasting existing message to room ${messageData.roomId}`);
                } else {
                    // Fallback to direct socket messaging
                    const recipientSocketIds = users[messageData.receiver] || users[messageData.receiver._id];
                    if (recipientSocketIds && recipientSocketIds.length > 0) {
                        recipientSocketIds.forEach(socketId => {
                            io.to(socketId).emit('receiveMessage', messageToSend);
                        });
                        console.log(`📨 Sent existing message to ${recipientSocketIds.length} recipient sockets`);
                    }
                }
                return;
            }

            // Handle file upload if present (legacy support)
            let fileUrl = '';
            let fileName = '';
            if (messageData.fileData && messageData.fileName) {
                const uploadResponse = await cloudinary.uploader.upload(
                    `data:${messageData.fileType};base64,${messageData.fileData}`,
                    {
                        folder: 'chat_uploads',
                        resource_type: 'auto',
                        public_id: `${Date.now()}-${messageData.fileName}`,
                    }
                );
                fileUrl = uploadResponse.secure_url;
                fileName = messageData.fileName;
            }

            // Create new message (legacy support)
            const newMessage = new Message({
                sender: messageData.sender,
                receiver: messageData.receiver,
                content: messageData.content || '',
                fileUrl,
                fileName,
                delivered: false,
            });

            await newMessage.save();
            await newMessage.populate('sender', 'username email');
            await newMessage.populate('receiver', 'username email');

            // Send to room or specific sockets
            if (messageData.roomId) {
                socket.to(messageData.roomId).emit('receiveMessage', newMessage);
            } else {
                const recipientSocketIds = users[messageData.receiver];
                if (recipientSocketIds && recipientSocketIds.length > 0) {
                    recipientSocketIds.forEach(socketId => {
                        io.to(socketId).emit('receiveMessage', newMessage);
                    });
                }
            }

            // Mark as delivered if recipient is online
            const recipientOnline = users[messageData.receiver] && users[messageData.receiver].length > 0;
            if (recipientOnline) {
                newMessage.delivered = true;
                await newMessage.save();
            }

        } catch (error) {
            console.error('❌ Message error:', error);
            socket.emit('messageError', { error: 'Message failed to send' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('🔌 Disconnected:', socket.id);
        
        let disconnectedUserId = null;

        // Remove socket from users object
        for (const [userId, socketIds] of Object.entries(users)) {
            const originalLength = socketIds.length;
            users[userId] = socketIds.filter(id => id !== socket.id);
            
            if (originalLength > users[userId].length) {
                disconnectedUserId = userId;
            }
            
            if (users[userId].length === 0) {
                delete users[userId];
                console.log(`🛑 ${userId} offline`);
                // Notify friends that user went offline
                broadcastUserStatus(userId, false);
            }
        }

        // Clean up user rooms
        if (userRooms[socket.id]) {
            delete userRooms[socket.id];
        }
    });

    // Broadcast user online/offline status to their friends
    function broadcastUserStatus(userId, isOnline) {
        socket.broadcast.emit('userStatusUpdate', {
            userId: userId,
            isOnline: isOnline
        });
        
        console.log(`📡 Broadcasted status update: ${userId} is ${isOnline ? 'online' : 'offline'}`);
    }
});

// Helper function to get online users
function getOnlineUsers() {
    return Object.keys(users);
}

// Debug endpoint
app.get('/api/debug/online-users', (req, res) => {
    res.json({
        onlineUsers: getOnlineUsers(),
        totalConnections: Object.values(users).reduce((sum, sockets) => sum + sockets.length, 0)
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});