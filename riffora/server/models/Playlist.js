const mongoose = require('mongoose');

/**
 * A Playlist belongs to an owner (User ref).
 * Songs are embedded YouTube video objects — same as likedSongs in User.
 * We store enough metadata so the UI can render without extra API calls.
 */
const songSchema = new mongoose.Schema({
  videoId:   { type: String, required: true },
  title:     { type: String, required: true },
  thumbnail: { type: String },
  artist:    { type: String },
  duration:  { type: String },
  addedAt:   { type: Date, default: Date.now },
});

const playlistSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true, // We always query playlists by owner
  },
  name: {
    type: String,
    required: [true, 'Playlist name is required'],
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  songs: [songSchema],
  isPublic: {
    type: Boolean,
    default: false,
  },
  thumbnail: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('Playlist', playlistSchema);
