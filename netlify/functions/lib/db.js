let MongoClient;
try {
  ({ MongoClient } = require('mongodb'));
} catch (error) {
  throw new Error(
    'The "mongodb" package is required to run Netlify functions. Install it in the environment before invoking any data APIs.',
  );
}

let cachedClient = null;
let cachedDb = null;
let cachedPromise = null;

async function connectToDatabase() {
  if (cachedDb && cachedClient) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
  }

  if (!cachedPromise) {
    cachedPromise = cachedClient.connect();
  }

  await cachedPromise;

  const dbName = process.env.MONGODB_DB || 'capture-link';
  const db = cachedClient.db(dbName);

  cachedDb = db;

  return { client: cachedClient, db };
}

async function getDb() {
  const { db } = await connectToDatabase();
  return db;
}

module.exports = {
  getDb,
};
