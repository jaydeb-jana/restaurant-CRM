import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://restaurant-crm:restaurant-crm@cluster0.oiajbkb.mongodb.net/restaurant_crm?retryWrites=true&w=majority&appName=Cluster0";

async function checkSessions() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    const settings = await db.collection("settings").findOne({ id: "app-settings" });
    const accounts = await db.collection("whatsappaccounts").find({}).toArray();

    console.log("--- Global Settings ---");
    console.log("Global AI Active:", settings?.globalAiActive);
    console.log("Active Bot Sessions:", settings?.activeBotSessions);
    
    console.log("\n--- Connected Accounts ---");
    accounts.forEach(acc => {
      console.log(`- ID: ${acc.sessionId} | Phone: ${acc.phoneNumber} | Status: ${acc.status}`);
    });

  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkSessions();
