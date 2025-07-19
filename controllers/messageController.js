const Message = require('../models/Message'); 
const jwt = require('jsonwebtoken');
const cloudinary = require('./cloudinary');
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

  try {
    // Upload file to Cloudinary if exists
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'chat_uploads',
        resource_type: 'auto', // handles both images & other files
      });

      fileUrl = result.secure_url;
      fileName = req.file.originalname;

      // Delete local temp file
      fs.unlinkSync(req.file.path);
    }

    const newMessage = new Message({
      sender,
      receiver,
      content: content || '',
      fileUrl,
      fileName,
    });

    await newMessage.save();

    // Emit real-time message
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
