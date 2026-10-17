const youtubeService = require('../services/youtubeService');
const { getRecommendations } = require('../services/recommendationEngine');

const sendSongList = (res, packed) => {
  res.json({
    success: true,
    results: packed.results,
    isDemo: packed.isDemo,
    fallbackReason: packed.fallbackReason || null,
    fromCache: Boolean(packed.fromCache),
    cachedAt: packed.cachedAt || null,
  });
};

// @route  GET /api/youtube/search  AND  GET /api/music/search?q=...
// @access Private
const search = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    const parsedLimit = Number.parseInt(limit, 10);
    if (typeof q !== 'string' || q.trim().length < 1) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 25) {
      return res.status(400).json({ success: false, message: 'limit must be an integer between 1 and 25' });
    }
    const packed = await youtubeService.searchVideos(q.trim(), parsedLimit);
    sendSongList(res, packed);
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/youtube/trending
// @access Private
const trending = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const packed = await youtubeService.getTrendingMusic(Math.min(parseInt(limit), 50));
    sendSongList(res, packed);
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/youtube/video/:id
// @access Private
const videoDetails = async (req, res, next) => {
  try {
    const video = await youtubeService.getVideoDetails(req.params.id);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });
    res.json({ success: true, video });
  } catch (error) {
    next(error);
  }
};

const lyrics = async (req, res, next) => {
  try {
    const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
    const artist = typeof req.query.artist === 'string' ? req.query.artist.trim() : '';
    if (!title) {
      return res.status(400).json({ success: false, message: 'Song title is required' });
    }
    const result = await youtubeService.getLyrics(title, artist);
    res.status(result.status === 'error' ? 502 : 200).json({ success: result.status !== 'error', ...result });
  } catch (error) {
    next(error);
  }
};


// @route  GET /api/youtube/artist?name=...
// @access Private
const artistSearch = async (req, res, next) => {
  try {
    const { name, limit = 10 } = req.query;
    if (!name) return res.status(400).json({ success: false, message: 'Artist name required' });
    const packed = await youtubeService.searchByArtist(name, Math.min(parseInt(limit), 20));
    sendSongList(res, packed);
  } catch (error) {
    next(error);
  }
};

// @route  GET /api/youtube/recommendations
// @access Private
const recommendations = async (req, res, next) => {
  try {
    const { recommendations: recs, reason } = await getRecommendations(req.user._id);
    res.json({
      success: true,
      recommendations: recs,
      reason,
      isDemo: youtubeService.isDemoMode(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { search, trending, videoDetails, lyrics, artistSearch, recommendations };
