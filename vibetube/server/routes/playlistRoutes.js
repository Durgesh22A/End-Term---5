const express = require('express');
const router = express.Router();
const {
  getPlaylists, getPlaylist, createPlaylist, updatePlaylist, deletePlaylist,
  addSong, removeSong, reorderSongs,
} = require('../controllers/playlistController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getPlaylists).post(createPlaylist);
router.route('/:id').get(getPlaylist).put(updatePlaylist).delete(deletePlaylist);
router.route('/:id/songs').post(addSong);
router.route('/:id/songs/:videoId').delete(removeSong);
router.put('/:id/songs/reorder', reorderSongs);

module.exports = router;
