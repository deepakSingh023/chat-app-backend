const Message = require('../models/Message'); 
const jwt = require('jsonwebtoken');

const getMessages = async (req, res) => {
    const { userId1, userId2 } = req.params; 
    console.log('Fetching messages between:', userId1, userId2); // Log user IDs

    try {
        const messages = await Message.find({
            $or: [
                { sender: userId1, receiver: userId2 },
                { sender: userId2, receiver: userId1 }
            ]
        }).sort({ timestamp: 1 });

        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};


const createMessage = async (req, res) => {
    const { senderId, receiverId, content } = req.body;
    try {
        const newMessage = new Message({ sender: senderId, receiver: receiverId, content });
        await newMessage.save();

        console.log('Emitting message:', newMessage); 

        req.io.emit('receiveMessage', newMessage);

        res.status(201).json(newMessage);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};


module.exports = { getMessages, createMessage };
