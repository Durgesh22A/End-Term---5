const ListeningHistory = require('../models/ListeningHistory');
const { preferArtwork } = require('../utils/artwork');

// @route  POST /api/history
// @access Private
const logPlay = async (req, res, next) => {
  try {
    const { videoId, title, thumbnail, artist, genre, duration } = req.body;
    if (!videoId || !title) {
      return res.status(400).json({ message: 'videoId and title required' });
    }

    // Keep one recent entry per song so repeated player events do not flood history.
    const existing = await ListeningHistory.findOne({ user: req.user._id, videoId });
    await ListeningHistory.findOneAndUpdate(
      { user: req.user._id, videoId },
      { title, thumbnail: preferArtwork(existing?.thumbnail, thumbnail, videoId), artist, genre, duration, playedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Keep at most 500 entries per user — delete oldest beyond that
    const count = await ListeningHistory.countDocuments({ user: req.user._id });
    if (count > 500) {
      const oldest = await ListeningHistory.find({ user: req.user._id })
        .sort({ playedAt: 1 })
        .limit(count - 500)
        .select('_id');
      await ListeningHistory.deleteMany({ _id: { $in: oldest.map(d => d._id) } });
    }

    res.status(201).json({ success: true, message: 'Play logged' });
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/history
// @access Private
const getHistory = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const history = await ListeningHistory.find({ user: req.user._id })
      .sort({ playedAt: -1 })
      .limit(Math.min(limit * 2, 200));
    const uniqueHistory = [];
    const seen = new Set();
    for (const entry of history) {
      if (!seen.has(entry.videoId)) {
        seen.add(entry.videoId);
        uniqueHistory.push(entry);
      }
      if (uniqueHistory.length === limit) break;
    }
    res.json({ success: true, history: uniqueHistory });
  } catch (error) {
    next(error);
  }
};

// @route  DELETE /api/history
// @access Private
const clearHistory = async (req, res, next) => {
  try {
    await ListeningHistory.deleteMany({ user: req.user._id });
    res.json({ success: true, message: 'History cleared' });
  } catch (error) {
    next(error);
  }
};

module.exports = { logPlay, getHistory, clearHistory };
