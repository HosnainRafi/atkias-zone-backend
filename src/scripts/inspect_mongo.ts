import { MongoClient } from "mongodb";

const uri =
  "mongodb+srv://vibebinarybd_db_user:1cBjiBHG5QrMHSLE@cluster0.u1nijux.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function inspect() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    console.log(
      "Databases:",
      dbs.databases.map((d) => d.name)
    );

    // Assuming the main db is one of them, let's pick the most likely one or list all non-system ones
    for (const dbInfo of dbs.databases) {
      if (["local", "admin", "config"].includes(dbInfo.name)) continue;

      console.log(`\nInspecting DB: ${dbInfo.name}`);
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      console.log(
        "Collections:",
        collections.map((c) => c.name)
      );

      // Sample a product to see structure
      const products = db.collection("products");
      const sample = await products.findOne({});
      if (sample) {
        console.log("Sample Product Keys:", Object.keys(sample));
      }

      // Sample an order
      const orders = db.collection("orders");
      const sampleOrder = await orders.findOne({});
      if (sampleOrder) {
        console.log("Sample Order Keys:", Object.keys(sampleOrder));
        console.log("Sample Order Data:", JSON.stringify(sampleOrder, null, 2));
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

inspect();
