// controllers/messageController.js
const Message = require('../models/Message');
const { cloudinary } = require('../cloudinary');

const getMessages = async (req, res) => {
  const { userId1, userId2 } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 },
      ],
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
    if (req.file && req.file.path) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'chat_uploads',
        resource_type: 'auto',
      });

      fileUrl = result.secure_url;
      fileName = req.file.originalname;
    }

    const newMessage = new Message({
      sender,
      receiver,
      content: content || '',
      fileUrl,
      fileName,
    });

    await newMessage.save();

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
