// backend/models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
