import { MongoClient } from "mongodb";

let client: MongoClient;

export async function connectToMongo() {
  if (!client) {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    client = new MongoClient(uri);
    await client.connect();
    console.log("✅ Connected to MongoDB");
  }
  return client.db("shopify_announcements");
}

export async function saveAnnouncement(shop: string, text: string) {
  const db = await connectToMongo();
  const result = await db.collection("announcements").insertOne({
    shop,
    text,
    timestamp: new Date(),
    createdAt: new Date(),
  });
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
