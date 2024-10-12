const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        sentFriendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        receivedFriendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    },
    { timestamps: true } // Automatically manage createdAt and updatedAt fields
);

const User = mongoose.model('User', userSchema);
module.exports = User;
