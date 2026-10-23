const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 RIFFORA server running on port ${PORT}`);
      console.log(`📺 Mode: ${process.env.NODE_ENV || 'development'}`);
      if (!process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY === 'your_youtube_data_api_v3_key') {
        console.log('⚠️  No YouTube API key — running in DEMO MODE with curated songs');
      }
    });
  })
  .catch((error) => {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  });
