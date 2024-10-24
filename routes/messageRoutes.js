const express = require('express');
const { getMessages, createMessage } = require('../controllers/messageController.js');
const auth = require('../middleware/authMiddleware.js');

const router = express.Router();


router.get('/messages/:userId1/:userId2', auth, getMessages);


router.post('/messages', auth, createMessage);

module.exports = router;

