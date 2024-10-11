const express = require('express');
const { getMessages, createMessage } = require('../controllers/messageController.js');
const auth = require('../middleware/authMiddleware.js');

const router = express.Router();

// Use query parameters for getting messages between two users
router.route('/messages/:userId1/:userId2')
  .get(auth, getMessages)
  .post(auth, createMessage);

module.exports = router;
