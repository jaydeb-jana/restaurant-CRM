import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://restaurant-crm:restaurant-crm@cluster0.oiajbkb.mongodb.net/restaurant_crm?retryWrites=true&w=majority&appName=Cluster0";

async function fixModels() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" });
    
    if (settings) {
        console.log(`Current model: ${settings.aiModel}`);
        
        // Map old decommissioned models to new ones
        const replacements: Record<string, string> = {
            "llama3-70b-8192": "llama-3.3-70b-versatile",
            "llama3-8b-8192": "llama-3.1-8b-instant",
            "mixtral-8x7b-32768": "mixtral-8x7b-32768" // This one is usually still active but might need check
        };

        const newModel = replacements[settings.aiModel] || "llama-3.3-70b-versatile";
        
        if (newModel !== settings.aiModel) {
            console.log(`Updating model to: ${newModel}`);
            await mongoose.connection.db?.collection("settings").updateOne(
                { id: "app-settings" },
                { $set: { aiModel: newModel } }
            );
            console.log("✅ Model updated.");
        } else {
            console.log("Model is already up to date.");
        }
    } else {
        console.log("No settings found to fix.");
    }

  } catch (err: any) {
    console.error("Fix error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixModels();
