const path = require('path');
// Load server/.env even if the process is started from another folder
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes     = require('./routes/authRoutes');
const userRoutes     = require('./routes/userRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const historyRoutes  = require('./routes/historyRoutes');
const youtubeRoutes  = require('./routes/youtubeRoutes');
const musicRoutes    = require('./routes/musicRoutes');

const app = express();

// ── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ── Core Middleware ──────────────────────────────────────────────────────────

/**
 * CORS — allows our Vite client (localhost:5173) to send cookies.
 * credentials: true is required for HTTP-only cookies to work cross-origin.
 * Without this, the browser will refuse to send the cookie to the server.
 */
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(cookieParser()); // Parse cookies from request headers

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/user',      userRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/history',   historyRoutes);
app.use('/api/youtube',   youtubeRoutes);
app.use('/api/music',     musicRoutes);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler (MUST be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 VibeTube server running on http://localhost:${PORT}`);
  console.log(`📺 Mode: ${process.env.NODE_ENV || 'development'}`);
  if (!process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY === 'your_youtube_data_api_v3_key') {
    console.log('⚠️  No YouTube API key — running in DEMO MODE with curated songs');
  }
});
