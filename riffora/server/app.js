const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const historyRoutes = require('./routes/historyRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes');
const musicRoutes = require('./routes/musicRoutes');

const app = express();
const connectDB = require('./config/db');
const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    const isVercelPreview = /^https:\/\/[^/]+\.vercel\.app$/.test(origin || '');
    if (!origin || configuredOrigins.includes(origin) || isVercelPreview) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', async (req, res, next) => {
  if (req.path === '/health' || req.path.startsWith('/youtube') || req.path.startsWith('/music')) {
    return next();
  }
  try {
    await connectDB();
    return next();
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    return res.status(503).json({ message: 'Database is temporarily unavailable.' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/music', musicRoutes);

// Serve the Vite build from the same Express app in production. On Vercel the
// app is deployed as one function, so its frontend assets must be served here.
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

module.exports = app;
