const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function clearDatabase() {
  let mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    const envPaths = [
      path.join(__dirname, '../apps/api/.env.local'),
      path.join(__dirname, '../apps/api/.env'),
    ];

    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/^MONGODB_URI=(.+)$/m);
        if (match) {
          mongoUri = match[1].trim().replace(/^["']|["']$/g, '');
          console.log(`Loaded MONGODB_URI from ${path.relative(process.cwd(), envPath)}`);
          break;
        }
      }
    }
  }

  if (!mongoUri) {
    console.error('Error: MONGODB_URI not found in environment or apps/api/.env.local file.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    if (collections.length === 0) {
      console.log('No collections found in the database.');
    } else {
      console.log(`\nFound ${collections.length} collection(s). Clearing data...`);
      for (const col of collections) {
        const result = await db.collection(col.name).deleteMany({});
        console.log(` - Cleared ${result.deletedCount} document(s) from collection: '${col.name}'`);
      }
    }

    console.log('\nDatabase cleanup completed successfully!');
  } catch (error) {
    console.error('Database cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

clearDatabase();
