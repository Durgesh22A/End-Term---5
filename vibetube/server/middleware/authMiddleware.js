const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protects routes: reads the JWT from an HTTP-only cookie (not localStorage!).
 * WHY cookies over localStorage?
 *   - HTTP-only cookies can't be read by JS, so XSS attacks can't steal the token.
 *   - localStorage is accessible by any script on the page — a common attack vector.
 */
const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.vibetube_token;
    if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }


    // Verify signature + expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (minus password)
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    next();
  } catch (error) {
    // jwt.verify throws if token is expired or tampered with
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }
};

/**
 * Optional auth — attaches user if logged in, but doesn't block the request.
 * Useful for public pages that show personalized content when logged in.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.vibetube_token;
    if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch {
    // Silently ignore — user stays unauthenticated
  }
  next();
};


module.exports = { protect, optionalAuth };
