import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connects to MongoDB Atlas / Local MongoDB instance.
 * Gracefully handles connection failures without terminating the server process,
 * allowing the API Gateway to operate in non-persisted / degraded mode.
 */
export const connectDatabase = async () => {
  if (!env.MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI is not set. Database persistence will be disabled.');
    return false;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB successfully.');
    return true;
  } catch (err) {
    console.warn(`⚠️ MongoDB connection warning: ${err.message}`);
    console.warn('ℹ️ If using MongoDB Atlas, ensure your current IP is whitelisted (or add 0.0.0.0/0 under Network Access in MongoDB Atlas).');
    console.warn('⚠️ System will continue running; verification runs will function in non-persisted mode.');
    return false;
  }
};

/**
 * Returns human-readable connection status string.
 */
export const getDatabaseStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'disconnected';
};

/**
 * Gracefully disconnects from MongoDB on process shutdown.
 */
export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
};
