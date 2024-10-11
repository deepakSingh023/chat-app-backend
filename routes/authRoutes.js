const express = require('express');
const { register, login, sendFriendRequest, acceptFriendRequest, getFriends, searchUsers, pendingRequest} = require('../controllers/authController.js');
const auth = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/register', register);
router.post('/login',  login);
router.post('/friend-request', auth, sendFriendRequest);
router.put('/accept-friend-request', auth, acceptFriendRequest);
router.get('/friends', auth, getFriends);
router.get('/search', auth, searchUsers); 
router.get('/pending-request', auth, pendingRequest)

module.exports =  router;
