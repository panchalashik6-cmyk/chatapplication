const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// JWT token generate karna
function makeToken(userId) {
  return jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// User Register
router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    // Input validation
    if (
      name.length < 2 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      password.length < 6
    ) {
      return res.status(400).json({
        message:
          "Enter a name, valid email, and password of at least 6 characters.",
      });
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    // Password hash karna
    const hashedPassword = await bcrypt.hash(password, 12);

    // User database mein save karna
    const user = await User.create({
      name: name,
      email: email,
      password: hashedPassword,
    });

    // Token generate karna
    const token = makeToken(user._id);

    // Response
    return res.status(201).json({
      token: token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    return res.status(500).json({
      message: "Could not register user.",
    });
  }
});

// User Login
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    // User find karna
    const user = await User.findOne({ email });

    // Password verify karna
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Incorrect email or password.",
      });
    }

    // JWT token generate karna
    const token = makeToken(user._id);

    // Login response
    return res.json({
      token: token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Could not log in.",
    });
  }
});

module.exports = router;