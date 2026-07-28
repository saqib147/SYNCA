import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // We'll throw an error if MONGODB_URI is missing, to fail fast.
  throw new Error('Please define the MONGODB_URI environment variable in .env or .env.local');
}

export const connectMongoDB = async (): Promise<typeof mongoose> => {
  // If connection is already established, return mongoose instance
  if (mongoose.connection.readyState >= 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections in pool
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds if connection fails
    });

    console.log('[MongoDB] Connected successfully to Atlas connection pool');
    return conn;
  } catch (error) {
    console.error('[MongoDB] Failed to connect to MongoDB Atlas:', error);
    throw error;
  }
};

// Monitor connection events
mongoose.connection.on('connected', () => {
  console.log('[MongoDB] Mongoose connection successfully established');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('[MongoDB] Mongoose connection disconnected');
});

// Graceful termination handler
const gracefulShutdown = async (signal: string) => {
  if (mongoose.connection.readyState === 0) {
    process.exit(0);
  }
  
  try {
    await mongoose.connection.close();
    console.log(`[MongoDB] Mongoose connection pool closed gracefully via (${signal})`);
    process.exit(0);
  } catch (err) {
    console.error('[MongoDB] Error occurred during Mongoose pool closing:', err);
    process.exit(1);
  }
};

// Listen for process termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
