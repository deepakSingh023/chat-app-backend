const User = require('../models/User.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

// Login a user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Send a friend request
const sendFriendRequest = async (req, res) => {
  const { receiverId } = req.body; // Receiver ID from the request body
  const senderId = req.user.id; // Authenticated user ID from the middleware

  try {
    // Find the receiver
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found.' });
    }

    // Check if the request already exists
    if (receiver.receivedFriendRequests.includes(senderId)) {
      return res.status(400).json({ message: 'Friend request already sent.' });
    }

    // Add senderId to the receiver's receivedFriendRequests
    receiver.receivedFriendRequests.push(senderId);
    await receiver.save();

    // Add receiverId to the sender's sentFriendRequests
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
  const { senderId } = req.body; // Sender's ID from the request body
  const userId = req.user.id; // Authenticated user ID from the middleware

  try {
    const user = await User.findById(userId);
    const sender = await User.findById(senderId);

    if (!sender) return res.status(404).json({ message: 'Sender not found.' });

    // Check if the request exists
    if (!user.receivedFriendRequests.includes(senderId)) {
      return res.status(400).json({ message: 'No friend request from this user.' });
    }

    // Add to each other's friends list
    user.friends.push(sender._id);
    sender.friends.push(user._id);

    // Remove the friend request from both users
    user.receivedFriendRequests.pull(sender._id);
    sender.sentFriendRequests.pull(user._id);

    await user.save();
    await sender.save();

    res.status(200).json({ message: 'Friend request accepted.' });
  } catch (error) {
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

module.exports = { register, login, sendFriendRequest, acceptFriendRequest, getFriends, searchUsers, pendingRequest };
