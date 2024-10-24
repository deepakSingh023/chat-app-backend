const User = require('../models/User'); 


const updateProfile = async (req, res) => {
    try {
        const { description } = req.body;
        const profilepic = req.file ? req.file.filename : undefined; // Handle file upload

        // Find and update the user's profile
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id, 
            {
                ...(profilepic && { profilepic }), // Update profile pic if provided
                ...(description && { description }) // Update description if provided
            },
            { new: true } // Return the updated user object
        );

        res.json({
            profilepic: updatedUser.profilepic,
            description: updatedUser.description
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error });
    }
};


const fetchProfile = async (req, res) => { 
    const {id}=req.params;
    try {
        const user = await User.findById(id).select('profilepic description');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            profilepic: user.profilepic,
            description: user.description
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error });
    }
};

module.exports = { updateProfile, fetchProfile }; 
