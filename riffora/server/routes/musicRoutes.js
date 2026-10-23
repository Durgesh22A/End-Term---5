const express = require('express');
const router = express.Router();
const { search } = require('../controllers/youtubeController');
const { optionalAuth } = require('../middleware/authMiddleware');
const { getDownloadableTracks, searchDownloadableTracks } = require('../services/directMusicService');

// Alias requested by the assignment: GET /api/music/search?q=...
// Reuses the same controller so youtube + music stay in sync.
router.get('/search', optionalAuth, search);


// GET /api/music/downloadable — Authorized downloadable tracks from Free To Use
router.get('/downloadable', async (req, res, next) => {
  try {
    const { limit = 20, genre = '' } = req.query;
    const tracks = await getDownloadableTracks({ limit, genre });
    res.json({ success: true, count: tracks.length, tracks });
  } catch (error) {
    next(error);
  }
});

// GET /api/music/downloadable/search?q=... — Search authorized downloadable tracks
router.get('/downloadable/search', async (req, res, next) => {
  try {
    const { q = '', limit = 20 } = req.query;
    const results = await searchDownloadableTracks(q, { limit });
    res.json({ success: true, count: results.length, results });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
