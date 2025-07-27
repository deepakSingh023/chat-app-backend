const express = require('express');
const { register, login, sendFriendRequest, acceptFriendRequest, getFriends, searchUsers, pendingRequest, rejectRequest, removeFriend, getUserInfo  } = require('../controllers/authController.js');
const auth = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/friend-request', auth, sendFriendRequest); // Auth required for friend request
router.post('/accept-request', auth, acceptFriendRequest); // Accept friend request
router.get('/friends', auth, getFriends); // Fetch friends list
router.get('/search', auth, searchUsers); // Search users by username
router.get('/pending-requests', auth, pendingRequest); // Get pending friend requests
router.post('/reject-request', auth, rejectRequest)//rejecting the friend request
router.post('/remove-friend', auth, removeFriend)
router.get('/getFriendInfo',auth , getUserInfo)
module.exports = router;
