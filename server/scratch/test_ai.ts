import mongoose from 'mongoose';
import fetch from 'node-fetch';

const MONGODB_URI = "mongodb+srv://restaurant-crm:restaurant-crm@cluster0.oiajbkb.mongodb.net/restaurant_crm?retryWrites=true&w=majority&appName=Cluster0";

async function testGroq() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" });
    console.log("Settings found in DB:");
    
    if (settings) {
        console.log({
            globalAiActive: settings.globalAiActive,
            groqApiKey: settings.groqApiKey ? "********" + settings.groqApiKey.slice(-4) : "MISSING",
            aiModel: settings.aiModel,
            activeBotSessions: settings.activeBotSessions
        });
    }

    if (!settings) {
      console.log("❌ No settings found in DB!");
      return;
    }

    if (!settings.globalAiActive) {
      console.log("⚠️ GLOBAL AI IS DISABLED (globalAiActive=false). Enable it in 'WhatsApp -> Settings -> AI Intelligence Unit'.");
    }

    if (!settings.groqApiKey) {
      console.log("❌ NO GROQ API KEY IN DB. Go to 'WhatsApp -> Settings' and add your API Key.");
    }

    if (!settings.activeBotSessions || settings.activeBotSessions.length === 0) {
      console.log("⚠️ NO ACTIVE BOT CHANNELS. Enable at least one session in 'Active Bot Channels'.");
    }

    if (!settings.groqApiKey || !settings.globalAiActive) return;

    const model = settings.aiModel || "llama-3.3-70b-versatile";
    console.log(`Testing Groq API with model: ${model}...`);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${settings.groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Hello, are you working?" }],
        temperature: 0.7
      })
    });

    const data: any = await response.json();
    if (response.ok) {
      console.log("✅ Groq API Working! AI Reply:", data.choices[0].message.content);
    } else {
      console.log("❌ Groq API Failed:", JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error("Test error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

testGroq();
