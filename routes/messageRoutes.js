const express = require('express');
const { getMessages, createMessage } = require('../controllers/messageController.js');
const auth = require('../middleware/authMiddleware.js');

const router = express.Router();

// GET messages between two users (User1 and User2)
router.get('/messages/:userId1/:userId2', auth, getMessages);

// POST a new message (single route for message creation)
router.post('/messages', auth, createMessage);

module.exports = router;

