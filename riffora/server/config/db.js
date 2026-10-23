const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the URI in .env
 * We export this as a function so server/index.js calls it once at startup.
 * Mongoose automatically reconnects, so we don't need extra retry logic here.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1); // Kill the server — no point running without a DB
  }
};

module.exports = connectDB;
