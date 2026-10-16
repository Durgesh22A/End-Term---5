const express = require('express');
const router = express.Router();
const { search, trending, videoDetails, lyrics, artistSearch, recommendations } = require('../controllers/youtubeController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.use(optionalAuth);

router.get('/search', search);
router.get('/trending', trending);
router.get('/video/:id', videoDetails);
router.get('/lyrics', lyrics);
router.get('/artist', artistSearch);
router.get('/recommendations', recommendations);

module.exports = router;

