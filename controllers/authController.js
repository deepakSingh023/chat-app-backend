const User = require('../models/User.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
const register = async(req,res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
}

// Login a user
const login = async(req,res) => {
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

}


// Add friend
// Send a friend request
const sendFriendRequest = async (req, res) => {
  const { senderId, receiverId } = req.body;

  try {
    // Find the receiver user
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Add senderId to receiver's receivedFriendRequests
    receiver.receivedFriendRequests.push(senderId);
    await receiver.save();

    // Add receiverId to sender's friendRequests
    const sender = await User.findById(senderId);
    sender.friendRequests.push(receiverId);
    await sender.save();

    res.status(200).json({ message: 'Friend request sent successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending friend request.', error });
  }
};

// Accept friend request
const acceptFriendRequest = async (req, res) => {
  try {
    const { id } = req.body; // id is the requester's ID
    const user = await User.findById(req.user.id);
    const requester = await User.findById(id);
    
    if (!requester) return res.status(404).json({ message: 'User not found' });
    
    user.friends.push(requester._id);
    requester.friends.push(user._id);
    user.friendRequests.pull(requester._id);
    
    // Save changes to the database
    await user.save();
    await requester.save();
    
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Error accepting friend request', error: error.message });
  }
};

// Get friends
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username');
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching friends', error: error.message });
  }
};

const searchUsers = async (req, res) => {
  const { name } = req.query;
  try {
      const users = await User.find({
          username: { $regex: name, $options: 'i' } // Case insensitive search
      }).select('username'); // Select only the username field
      res.json(users);
  } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ message: 'Server error' });
  }
};

const pendingRequest = async (req, res) => {
  try {
    // Find the authenticated user
    const user = await User.findById(req.user.id).populate('friendRequests', 'username');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If no friend requests are found, respond with an empty array
    if (!user.receivedFriendRequests.length) {
      return res.json({ pendingRequests: [] });
    }

    // Create an array of pending requests (those who sent requests to the current user)
    const pendingRequests = user.receivedFriendRequests.map(request => ({
      userId: request._id,
      username: request.username,
    }));

    res.json({ pendingRequests });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};


module.exports = { register, login, sendFriendRequest, acceptFriendRequest, getFriends, searchUsers, pendingRequest };
