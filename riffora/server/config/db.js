const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the URI in .env
 * We export this as a function so server/index.js calls it once at startup.
 * Mongoose automatically reconnects, so we don't need extra retry logic here.
 */
let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
      .then(({ connection }) => {
        console.log(`✅ MongoDB connected: ${connection.host}`);
        return connection;
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
};

module.exports = connectDB;
