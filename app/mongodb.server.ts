import { MongoClient, type Db } from "mongodb";

const DB_NAME = "shopify_announcements";

declare global {
  // Cached across Vite HMR reloads in development so we never orphan a client.
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (!global.__mongoClientPromise) {
    const client = new MongoClient(uri);
    global.__mongoClientPromise = client
      .connect()
      .then((connected) => {
        console.log("✅ Connected to MongoDB Atlas for announcements");
        return connected;
      })
      .catch((err) => {
        // Don't cache a failed/closed connection — let the next call retry.
        global.__mongoClientPromise = undefined;
        throw err;
      });
  }

  return global.__mongoClientPromise;
}

export async function connectToMongo(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}

export async function saveAnnouncement(shop: string, text: string) {
  const db = await connectToMongo();
  const result = await db.collection("announcements").insertOne({
    shop,
    text,
    timestamp: new Date(),
    createdAt: new Date(),
  });
  console.log("📝 Saved announcement to MongoDB Atlas:", { shop, text });
  return result;
}

export async function getAnnouncementHistory(shop: string) {
  const db = await connectToMongo();
  return await db
    .collection("announcements")
    .find({ shop })
    .sort({ timestamp: -1 })
    .limit(50)
    .toArray();
}
