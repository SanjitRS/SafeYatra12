const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tourist_safety';

  try {
    // Attempt standard connection with 3.5s timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3500
    });
    console.log(`[Database] Connected to MongoDB at ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
  } catch (primaryErr) {
    console.warn(`[Database] Could not connect to primary MongoDB (${primaryErr.message}).`);

    // In development/test mode, seamlessly start an in-memory MongoDB instance
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[Database] Starting in-memory MongoDB instance for zero-config demonstration...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoMemoryServer = await MongoMemoryServer.create();
        const memoryUri = mongoMemoryServer.getUri();
        await mongoose.connect(memoryUri);
        console.log(`[Database] In-memory MongoDB active and connected at ${memoryUri}`);
      } catch (memErr) {
        console.error('[Database] Failed to launch in-memory MongoDB:', memErr.message);
        throw primaryErr;
      }
    } else {
      throw primaryErr;
    }
  }
};

const closeDB = async () => {
  await mongoose.connection.close();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};

module.exports = { connectDB, closeDB };
