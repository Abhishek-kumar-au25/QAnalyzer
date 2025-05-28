// src/lib/mongodb.ts
import { MongoClient, Db, ServerApiVersion } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}
if (!MONGODB_DB_NAME) {
  throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
interface GlobalWithMongo extends NodeJS.Global {
    _mongoClientPromise?: Promise<MongoClient>;
}
  
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient, db: Db }> {
  if (cachedClient && cachedDb) {
    try {
        // Ping the server to check if the connection is still alive
        await cachedClient.db("admin").command({ ping: 1 });
        return { client: cachedClient, db: cachedDb };
    } catch (e) {
        console.warn("MongoDB connection lost, attempting to reconnect.", e);
        cachedClient = null;
        cachedDb = null;
    }
  }

  const globalWithMongo = global as GlobalWithMongo;

  if (!globalWithMongo._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
    });
    globalWithMongo._mongoClientPromise = client.connect();
    console.log("Attempting to connect to MongoDB Atlas...");
  }
  
  try {
    cachedClient = await globalWithMongo._mongoClientPromise;
    cachedDb = cachedClient.db(MONGODB_DB_NAME);
    console.log("Successfully connected to MongoDB Atlas! Database: " + MONGODB_DB_NAME);
    return { client: cachedClient, db: cachedDb };
  } catch (e) {
    console.error("Failed to connect to MongoDB Atlas", e);
    // Clear the promise if connection fails to allow retries on next request
    globalWithMongo._mongoClientPromise = undefined; 
    throw e; // Re-throw the error to be handled by the caller
  }
}

// Example of how to use it:
// import { connectToDatabase } from '@/lib/mongodb';
//
// export async function getSomeData() {
//   const { db } = await connectToDatabase();
//   const collection = db.collection('your_collection_name');
//   const data = await collection.find({}).toArray();
//   return data;
// }
