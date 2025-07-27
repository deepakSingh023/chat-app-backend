const User = require('../models/User.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Default profile picture
const DEFAULT_PROFILE_PIC = 'default.jpeg';

// Register a new user
const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user with the default profile picture
    const newUser = new User({
      username,
      password: hashedPassword,
      profilePic: DEFAULT_PROFILE_PIC,
      description: '' 
    });

    // Save the new user to the database
    await newUser.save();

    // Respond with a success message
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    // Handle any errors during registration
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

// Login a user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, username: user.username, token:user.token} });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Send a friend request
const sendFriendRequest = async (req, res) => {
  const { receiverId } = req.body; // Receiver ID from the request body
  const senderId = req.user.id; // Authenticated user ID from the middleware

  try {
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found.' });
    }

    if (receiver.friends.includes(senderId)) {
      return res.status(400).json({ message: 'You are already friends with this user.' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'You cannot send a friend request to yourself.' });
    }

    if (receiver.receivedFriendRequests.includes(senderId)) {
      return res.status(400).json({ message: 'Friend request already sent.' });
    }

    receiver.receivedFriendRequests.push(senderId);
    await receiver.save();

    const sender = await User.findById(senderId);
    sender.sentFriendRequests.push(receiverId);
    await sender.save();

    res.status(200).json({ message: 'Friend request sent successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending friend request.', error: error.message });
  }
};

// Accept a friend request
const acceptFriendRequest = async (req, res) => {
  const { id } = req.body;
  const userId = req.user.id;

  console.log('Received friend request from sender ID:', id);
  console.log('Authenticated user ID:', userId);

  if (!id) {
    return res.status(400).json({ message: 'No request ID provided.' });
  }

  try {
    const user = await User.findById(userId);
    const sender = await User.findById(id);

    if (!sender) {
      console.log('Sender not found for ID:', id);
      return res.status(404).json({ message: 'Sender not found.' });
    }

    if (!user.receivedFriendRequests.includes(sender._id)) {
      return res.status(400).json({ message: 'No friend request from this user.' });
    }

    user.friends.push(sender._id);
    sender.friends.push(user._id);

    user.receivedFriendRequests.pull(sender._id);
    sender.sentFriendRequests.pull(user._id);

    await user.save();
    await sender.save();

    res.status(200).json({ message: 'Friend request accepted.' });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Error accepting friend request.', error: error.message });
  }
};

// Get all pending friend requests
const pendingRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('receivedFriendRequests', 'username');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const pendingRequests = user.receivedFriendRequests.map(request => ({
      userId: request._id,
      username: request.username,
    }));

    res.json({ pendingRequests });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending requests.', error: error.message });
  }
};

// Get a list of friends
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username');

    if (!user) return res.status(404).json({ message: 'User not found.' });

    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching friends.', error: error.message });
  }
};

// Search users by username
const searchUsers = async (req, res) => {
  const { name } = req.query;

  try {
    const users = await User.find({
      username: { $regex: name, $options: 'i' } // Case-insensitive search
    }).select('username');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error searching users.', error: error.message });
  }
};

// Reject a friend request
const rejectRequest = async (req, res) => {
  const { id } = req.body;
  const userID = req.user.id;

  if (!id) {
    return res.status(400).json({ message: 'No request ID provided.' });
  }

  try {
    const user = await User.findById(userID);
    const sender = await User.findById(id);

    if (!sender) {
      console.log('Sender not found for ID:', id);
      return res.status(404).json({ message: 'Sender not found.' });
    }

    if (!user.receivedFriendRequests.includes(sender._id)) {
      return res.status(400).json({ message: 'No friend request from this user.' });
    }

    user.receivedFriendRequests.pull(sender._id);
    sender.sentFriendRequests.pull(user._id);

    await user.save();
    await sender.save();

    res.status(200).json({ message: 'Friend request rejected.' });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Error rejecting friend request.', error: error.message });
  }
};

// Remove a friend
const removeFriend = async (req, res) => {
  const { friendId } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ message: 'Friend not found.' });
    }

    user.friends.pull(friend._id);
    friend.friends.pull(user._id);

    await user.save();
    await friend.save();

    res.status(200).json({ message: 'Friend removed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing friend.', error: error.message });
  }
};

const getUserInfo = async(req,res)=>{

  try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('username _id'); // Only return username and id
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }


}

module.exports = {
  register,
  login,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  searchUsers,
  pendingRequest,
  rejectRequest,
  removeFriend,
  getUserInfo 
};
