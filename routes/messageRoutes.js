const express = require('express');
const { getMessages, createMessage } = require('../controllers/messageController.js');
const auth = require('../middleware/authMiddleware.js');
const upload = require('../middleware/upload');

const router = express.Router();


router.get('/messages/:userId1/:userId2', auth, getMessages);


router.post('/messages', auth, upload.single('file'), createMessage);

module.exports = router;

