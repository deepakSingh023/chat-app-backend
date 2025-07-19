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
  const { sender, receiver, content } = req.body;

  if (!sender || !receiver) {
    return res.status(400).send('Sender and receiver are required');
  }

  let fileUrl = '';
  let fileName = '';

  if (req.file) {
    fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
  }

  try {
    const newMessage = new Message({
      sender,
      receiver,
      content: content || '',
      fileUrl,
      fileName,
    });

    await newMessage.save();

    // Broadcast to receiver
    if (req.io) {
      req.io.to(receiver).emit('receiveMessage', newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};



module.exports = { getMessages, createMessage };
