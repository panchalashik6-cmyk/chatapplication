const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } }).select('name email').sort({ name: 1 });
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Could not load users.' });
  }
});

module.exports = router;
