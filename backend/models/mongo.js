import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ServerApiVersion } from "mongodb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const uri = process.env.MONGODB_CONNECTION_STRING;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

export async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db("Canvas");

    console.log("✅ Connected to MongoDB");
  }
  return db;
}

