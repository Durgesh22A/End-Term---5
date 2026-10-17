const jwt = require('jsonwebtoken');
const User = require('../models/User');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

/**
 * generateToken — creates a signed JWT and sets it as an HTTP-only cookie.
 * We put this helper here so both register and login share the same logic.
 */
const generateToken = (res, userId) => {
  if (!process.env.JWT_SECRET) {
    const error = new Error('Authentication is temporarily unavailable. Server configuration is incomplete.');
    error.statusCode = 503;
    throw error;
  }
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.cookie('vibetube_token', token, {
    httpOnly: true,   // Not accessible via document.cookie — blocks XSS
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict', // Blocks CSRF from other origins
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  return token;
};

// @route  POST /api/auth/register
// @access Public
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!String(name || '').trim() || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (String(name).trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name: String(name).trim(), email: normalizedEmail, password });

    const token = generateToken(res, user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        subscription: user.subscription,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/auth/login
// @access Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Must explicitly select password since schema has select: false
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      // Generic message — don't tell the attacker which field is wrong
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(res, user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        subscription: user.subscription,
        avatar: user.avatar,
      },
    });

  } catch (error) {
    next(error);
  }
};

// @route  POST /api/auth/logout
// @access Private
const logout = (req, res) => {
  // Clear the cookie — browser deletes it
  res.cookie('vibetube_token', '', { httpOnly: true, expires: new Date(0) });
  res.json({ success: true, message: 'Logged out successfully' });
};

// @route  GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
  // req.user is already attached by the protect middleware
  res.json({ success: true, user: req.user });
};

module.exports = { register, login, logout, getMe };
