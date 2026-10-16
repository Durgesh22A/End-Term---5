const User = require('../models/User');
const { preferArtwork } = require('../utils/artwork');

// @route  GET /api/user/liked
// @access Private
const getLikedSongs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('likedSongs');
    // Return newest likes first
    const sorted = [...user.likedSongs].sort((a, b) => b.likedAt - a.likedAt);
    res.json({ success: true, likedSongs: sorted });
  } catch (error) {
    next(error);
  }
};

// @route  POST /api/user/liked/:videoId
// @access Private
const likeSong = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { title, thumbnail, artist, duration } = req.body;

    const user = await User.findById(req.user._id);

    // Prevent duplicates
    const alreadyLiked = user.likedSongs.some(s => s.videoId === videoId);
    if (alreadyLiked) {
      return res.status(400).json({ message: 'Song already liked' });
    }

    user.likedSongs.push({ videoId, title, thumbnail: preferArtwork('', thumbnail, videoId), artist, duration });
    await user.save();

    res.status(201).json({ success: true, message: 'Song liked' });
  } catch (error) {
    next(error);
  }
};

// @route  DELETE /api/user/liked/:videoId
// @access Private
const unlikeSong = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { likedSongs: { videoId } }, // MongoDB $pull removes matching subdoc
    });

    res.json({ success: true, message: 'Song unliked' });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/user/liked/:videoId/status
// @access Private
const getLikeStatus = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const user = await User.findById(req.user._id).select('likedSongs');
    const liked = user.likedSongs.some(s => s.videoId === videoId);
    res.json({ success: true, liked });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLikedSongs, likeSong, unlikeSong, getLikeStatus };
