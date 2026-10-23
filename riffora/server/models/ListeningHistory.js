const mongoose = require('mongoose');

/**
 * ListeningHistory tracks every play event.
 * This is the raw data our recommendation engine reads.
 * We cap history at 500 entries per user (TTL index + app-level trim).
 * genre is stored if we can infer it — helps recommendations even if
 * the user hasn't explicitly liked the song.
 */
const historySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  videoId:   { type: String, required: true },
  title:     { type: String, required: true },
  thumbnail: { type: String },
  artist:    { type: String },
  genre:     { type: String, default: '' },
  duration:  { type: String },
  playedAt:  { type: Date, default: Date.now },
});

// Expire history entries after 90 days automatically (MongoDB TTL index)
historySchema.index({ playedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

// Compound index for fast "get user's recent history" queries
historySchema.index({ user: 1, playedAt: -1 });

module.exports = mongoose.model('ListeningHistory', historySchema);
