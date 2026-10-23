const express = require('express');
const router = express.Router();
const { getLikedSongs, likeSong, unlikeSong, getLikeStatus } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // All user routes require auth

router.get('/liked', getLikedSongs);
router.post('/liked/:videoId', likeSong);
router.delete('/liked/:videoId', unlikeSong);
router.get('/liked/:videoId/status', getLikeStatus);

module.exports = router;
