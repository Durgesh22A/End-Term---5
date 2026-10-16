const express = require('express');
const router = express.Router();
const { logPlay, getHistory, clearHistory } = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(getHistory).post(logPlay).delete(clearHistory);

module.exports = router;
