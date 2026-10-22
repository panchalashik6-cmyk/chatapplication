const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'Invalid user id.' });
    const otherUser = await User.exists({ _id: userId });
    if (!otherUser) return res.status(404).json({ message: 'User not found.' });
    const messages = await Message.find({
      $or: [
        { sender: req.userId, receiver: userId },
        { sender: userId, receiver: req.userId }
      ]
    }).sort({ createdAt: 1 }).limit(500);
    res.json(messages);
  } catch {
    res.status(500).json({ message: 'Could not load conversation.' });
  }
});

module.exports = router;
