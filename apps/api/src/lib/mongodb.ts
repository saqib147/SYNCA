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

    // Drop legacy workspaceId_1_slug_1 index from pre-workspace-removal schema if still present
    try {
      const projectsCol = conn.connection.db?.collection('projects');
      if (projectsCol) {
        const indexes = await projectsCol.indexes();
        if (indexes.some((idx) => idx.name === 'workspaceId_1_slug_1')) {
          await projectsCol.dropIndex('workspaceId_1_slug_1');
          console.log('[MongoDB] Dropped legacy projects index: workspaceId_1_slug_1');
        }
      }
    } catch (indexErr) {
      console.warn('[MongoDB] Legacy index cleanup skipped:', (indexErr as Error)?.message);
    }

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

export const closeMongoDB = async () => {
  if (mongoose.connection.readyState === 0) return;
  try {
    await mongoose.connection.close();
    console.log('[MongoDB] Mongoose connection pool closed gracefully');
  } catch (err) {
    console.error('[MongoDB] Error occurred during Mongoose pool closing:', err);
  }
};
