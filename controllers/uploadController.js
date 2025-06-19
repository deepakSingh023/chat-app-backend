const User = require('../models/User');
const { cloudinary } = require('../cloudinary'); // Ensure this exports cloudinary.v2

// Update user profile (Cloudinary upload)
const updateProfile = async (req, res) => {
  try {
    const { description } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized: User ID missing' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If there's a new file and an existing image, delete old image
    if (req.file && user.profilepic?.public_id) {
      await cloudinary.uploader.destroy(user.profilepic.public_id);
    }

    // Prepare updated fields
    const updates = {};
    if (description) updates.description = description;

    if (req.file && req.file.path && req.file.filename) {
      // Save both Cloudinary URL and public_id
      updates.profilepic = {
        url: req.file.path,
        public_id: req.file.filename
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    );

    return res.json({
      profilepic: updatedUser.profilepic,
      description: updatedUser.description,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      message: 'Server error while updating profile',
      error: error.message,
    });
  }
};

// Fetch user profile by ID
const fetchProfile = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  try {
    const user = await User.findById(id).select('profilepic description');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      profilepic: user.profilepic, // Contains both URL and public_id
      description: user.description,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      message: 'Server error while fetching profile',
      error: error.message,
    });
  }
};

module.exports = { updateProfile, fetchProfile };
