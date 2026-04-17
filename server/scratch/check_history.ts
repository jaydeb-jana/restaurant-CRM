import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://restaurant-crm:restaurant-crm@cluster0.oiajbkb.mongodb.net/restaurant_crm?retryWrites=true&w=majority&appName=Cluster0";

async function checkHistory() {
  try {
    console.log("Connecting...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    const count = await mongoose.connection.db?.collection("whatsapp_messages").countDocuments();
    console.log(`Total messages in history: ${count}`);

    if (count && count > 0) {
        const latest = await mongoose.connection.db?.collection("whatsapp_messages").find({}).sort({ timestamp: -1 }).limit(5).toArray();
        console.log("Latest 5 messages:", JSON.stringify(latest, null, 2));
    }
    
    const bcastCount = await mongoose.connection.db?.collection("broadcast_history").countDocuments();
    console.log(`Total broadcasts in history: ${bcastCount}`);

  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkHistory();
