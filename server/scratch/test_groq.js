import mongoose from "mongoose";

const MONGODB_URI = "mongodb+srv://restaurant-crm:restaurant-crm@cluster0.oiajbkb.mongodb.net/restaurant_crm?retryWrites=true&w=majority&appName=Cluster0";

async function testGroq() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    const settings = await mongoose.connection.db.collection("settings").findOne({ id: "app-settings" });
    
    if (!settings || !settings.groqApiKey) {
      console.error("GROQ API Key not found in settings!");
      process.exit(1);
    }

    console.log("Found Groq API Key (masked):", settings.groqApiKey.slice(0, 8) + "...");
    const apiKey = settings.groqApiKey;

    console.log("Testing Groq API...");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Say 'Hello, I am working!' if you can hear me." }],
        max_tokens: 20
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log("SUCCESS! Groq Response:", data.choices?.[0]?.message?.content);
    } else {
      console.error("FAILURE! Groq Error:", data);
    }

  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

testGroq();
