const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * WHY these fields?
 * - likedSongs: array of video objects (not IDs to a collection) because a
 *   liked song is a YouTube video — it doesn't live in our DB. Embedding is fine.
 * - subscription: 'free' | 'premium' — used later for Razorpay gating.
 */
const songSchema = new mongoose.Schema({
  videoId:   { type: String, required: true },
  title:     { type: String, required: true },
  thumbnail: { type: String },
  artist:    { type: String },
  duration:  { type: String },
  likedAt:   { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false, // Never return password in queries by default
  },
  avatar: {
    type: String,
    default: '',
  },
  likedSongs: [songSchema],
  subscription: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free',
  },
}, { timestamps: true });

// Hash password before saving — never store plain text
// WHY no next()? In Mongoose 8+, async pre-hooks auto-resolve when the
// promise settles. Calling next() on an async hook throws "next is not a function".
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return; // Only hash if changed
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords at login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
