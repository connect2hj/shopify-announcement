import { MongoClient } from "mongodb";

const uri =
  "mongodb+srv://admin:password1!@cluster0.nlt8c77.mongodb.net/?appName=Cluster0";

async function testConnection() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log("✅ Successfully connected to MongoDB Atlas!");

    const db = client.db("test");
    const collections = await db.listCollections().toArray();
    console.log("📚 Collections:", collections);

    await client.close();
  } catch (error) {
    console.error("❌ Connection failed:", error);
  }
}

testConnection();
