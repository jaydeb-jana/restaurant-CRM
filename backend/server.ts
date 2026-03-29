import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import pkg, { type Client as ClientType } from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = "mongodb://localhost:27017/jaydbapp";

// Helper for formatting WhatsApp numbers explicitly for India if 10 digits
const formatPhoneForWhatsApp = (phone: string) => {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  return `${cleaned}@c.us`;
};

// WhatsApp Client Initialization
let whatsappStatus: "disconnected" | "connecting" | "connected" = "disconnected";
let whatsappQR: string | null = null;
let whatsappClient: ClientType | null = null;

const initWhatsApp = () => {
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-accelerated-2d-canvas", "--no-first-run", "--no-zygote", "--disable-gpu"]
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
  });

  whatsappClient.on("qr", async (qr) => {
    console.log("WhatsApp QR Received");
    whatsappStatus = "connecting";
    try {
      whatsappQR = await qrcode.toDataURL(qr);
    } catch (err) {
      console.error("Error generating QR code:", err);
    }
  });

  whatsappClient.on("ready", async () => {
    console.log("WhatsApp Client is ready!");
    whatsappStatus = "connected";
    whatsappQR = null;
    
    // Update DB settings
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.collection("settings").updateOne(
        { id: "app-settings" },
        { $set: { whatsappConnected: true } },
        { upsert: true }
      );
    }
  });

  whatsappClient.on("authenticated", () => {
    console.log("WhatsApp Authenticated");
  });

  whatsappClient.on("auth_failure", (msg) => {
    console.error("WhatsApp Auth Failure:", msg);
    whatsappStatus = "disconnected";
    whatsappQR = null;
  });

  whatsappClient.on("disconnected", async (reason) => {
    console.log("WhatsApp Disconnected:", reason);
    whatsappStatus = "disconnected";
    whatsappQR = null;
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.collection("settings").updateOne(
        { id: "app-settings" },
        { $set: { whatsappConnected: false } },
        { upsert: true }
      );
    }
  });

  try {
    whatsappClient.initialize().catch(err => {
      console.error("Failed to initialize WhatsApp Client:", err);
      whatsappStatus = "disconnected";
    });
  } catch (err) {
    console.error("WhatsApp initialization error:", err);
  }
};


// Initial data structure for seeding
const INITIAL_DB = {
  menuItems: [
    { id: "1", name: "Butter Chicken", price: 350, category: "Main Course", description: "Creamy tomato-based curry with tender chicken.", image: "https://picsum.photos/seed/chicken/400/300", available: true, popular: true },
    { id: "2", name: "Paneer Tikka", price: 280, category: "Appetizers", description: "Grilled cottage cheese with spices.", image: "https://picsum.photos/seed/paneer/400/300", available: true, popular: true },
    { id: "3", name: "Mango Lassi", price: 120, category: "Beverages", description: "Sweet yogurt-based mango drink.", image: "https://picsum.photos/seed/lassi/400/300", available: true, popular: false }
  ],
  categories: ["Main Course", "Appetizers", "Beverages", "Desserts"],
  orders: [],
  tables: [
    { id: "table-1", status: "free", capacity: 2 },
    { id: "table-2", status: "free", capacity: 4 },
    { id: "table-3", status: "occupied", capacity: 4 },
    { id: "table-4", status: "free", capacity: 6 }
  ],
  settings: {
    id: "app-settings",
    isOpen: true,
    whatsappConnected: true,
    restaurantName: "Spice Kraft"
  }
};

async function seedDatabase() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    
    const menuCount = await db.collection("menuItems").countDocuments();
    if (menuCount === 0) {
      console.log("Seeding initial database...");
      await db.collection("menuItems").insertMany(INITIAL_DB.menuItems);
      
      const categoryDocs = INITIAL_DB.categories.map((name, i) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        order: i
      }));
      await db.collection("categories").insertMany(categoryDocs);
      
      await db.collection("tables").insertMany(INITIAL_DB.tables);
      
      await db.collection("settings").updateOne(
        { id: "app-settings" },
        { $set: INITIAL_DB.settings },
        { upsert: true }
      );
      console.log("Database seeded successfully.");
    }
  } catch (err) {
    console.error("Error seeding database:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Connect to MongoDB
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully locally");
    await seedDatabase();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
  }

  // Start WhatsApp on server start
  initWhatsApp();

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // DB Routes
  app.get("/api/db/:collection", async (req, res) => {
    try {
      const { collection } = req.params;
      const data = await mongoose.connection.db?.collection(collection).find({}).toArray();
      const formatted = data?.map(doc => {
        const { _id, ...rest } = doc;
        return rest;
      }) || [];
      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: "Database read error" });
    }
  });

  app.post("/api/db/:collection", async (req, res) => {
    try {
      const { collection } = req.params;
      const newItem = { id: Date.now().toString(), ...req.body };
      await mongoose.connection.db?.collection(collection).insertOne(newItem);
      const { _id, ...rest } = newItem as any;
      res.json(rest);
    } catch (error) {
      res.status(500).json({ error: "Database write error" });
    }
  });

  app.put("/api/db/:collection/:id", async (req, res) => {
    try {
      const { collection, id } = req.params;
      const updateResult = await mongoose.connection.db?.collection(collection).findOneAndUpdate(
        { id },
        { $set: req.body },
        { returnDocument: "after" }
      );
      if (updateResult) {
        const { _id, ...rest } = updateResult as any;
        res.json(rest);
      } else {
        res.status(404).json({ error: "Not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Database update error" });
    }
  });

  app.delete("/api/db/:collection/:id", async (req, res) => {
    try {
      const { collection, id } = req.params;
      await mongoose.connection.db?.collection(collection).deleteOne({ id });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Database delete error" });
    }
  });

  // Settings specific
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" });
      if (settings) {
        const { _id, ...rest } = settings;
        res.json(rest);
      } else {
        res.json(INITIAL_DB.settings);
      }
    } catch (error) {
      res.status(500).json({ error: "Settings read error" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const updateResult = await mongoose.connection.db?.collection("settings").findOneAndUpdate(
        { id: "app-settings" },
        { $set: req.body },
        { returnDocument: "after", upsert: true }
      );
      if (updateResult) {
        const { _id, ...rest } = updateResult as any;
        res.json(rest);
      } else {
         res.json({ id: "app-settings", ...req.body });
      }
    } catch (error) {
      res.status(500).json({ error: "Settings update error" });
    }
  });

  // WhatsApp Real Integration Routes
  app.get("/api/whatsapp/status", (req, res) => {
    res.json({ 
      status: whatsappStatus, 
      qr: whatsappQR,
      connected: whatsappStatus === "connected"
    });
  });

  app.post("/api/whatsapp/connect", (req, res) => {
    if (whatsappStatus === "disconnected") {
      initWhatsApp();
      res.json({ success: true, message: "Initializing WhatsApp connection..." });
    } else {
      res.json({ success: false, message: "WhatsApp is already connecting or connected." });
    }
  });

  app.post("/api/whatsapp/disconnect", async (req, res) => {
    if (whatsappClient) {
      try {
        await whatsappClient.logout();
        await whatsappClient.destroy();
        whatsappClient = null;
        whatsappStatus = "disconnected";
        whatsappQR = null;
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: "Failed to disconnect" });
      }
    } else {
      res.json({ success: true });
    }
  });

  app.post("/api/whatsapp/send-test", async (req, res) => {
    const { phone, message } = req.body;
    if (whatsappStatus !== "connected" || !whatsappClient) {
      return res.status(400).json({ error: "WhatsApp not connected" });
    }

    try {
      const chatId = formatPhoneForWhatsApp(phone);
      await whatsappClient.sendMessage(chatId, message);
      res.json({ success: true });
    } catch (err) {
      console.error("Error sending WhatsApp message:", err);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Fetch all registered customers
  app.get("/api/whatsapp/customers", async (req, res) => {
    try {
      const customers = await mongoose.connection.db?.collection("customers").find({}).sort({ createdAt: -1 }).toArray();
      const formatted = customers?.map(doc => {
        const { _id, ...rest } = doc;
        return rest;
      }) || [];
      res.json(formatted);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Bulk send messages
  app.post("/api/whatsapp/bulk-send", async (req, res) => {
    const { phones, message } = req.body;
    if (whatsappStatus !== "connected" || !whatsappClient) {
      return res.status(400).json({ error: "WhatsApp not connected" });
    }
    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return res.status(400).json({ error: "No phone numbers provided" });
    }

    try {
      const results = [];
      for (const phone of phones) {
        try {
          const chatId = formatPhoneForWhatsApp(phone);
          await whatsappClient.sendMessage(chatId, message);
          results.push({ phone, status: "success" });
          // Introduce a tiny delay so we don't get blocked
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          results.push({ phone, status: "failed", error: err.message });
        }
      }
      res.json({ success: true, results });
    } catch (err) {
      res.status(500).json({ error: "Fatal error in bulk send" });
    }
  });

  // Simulated WhatsApp OTP (Now uses real WhatsApp if connected)
  app.post("/api/auth/whatsapp/otp", async (req, res) => {
    const { phone } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Sending OTP ${otp} to ${phone}`);

    if (whatsappStatus === "connected" && whatsappClient) {
      try {
        const chatId = formatPhoneForWhatsApp(phone);
        const otpTemplate = `*Spice Kraft Restaurant*\n\nYour secure login OTP is: *${otp}*\n\nPlease do not share this code with anyone. Happy dining! 🍛`;
        await whatsappClient.sendMessage(chatId, otpTemplate);
        res.json({ success: true, message: "OTP sent via WhatsApp", otp }); 
      } catch (err) {
        res.json({ success: true, message: "OTP sent via WhatsApp (Simulated - real failed)", otp });
      }
    } else {
      res.json({ success: true, message: "OTP sent via WhatsApp (Simulated)", otp });
    }
  });

  // Verify OTP and save customer to DB
  app.post("/api/auth/whatsapp/verify", async (req, res) => {
    const { phone, otp } = req.body;
    // In a real app we'd verify OTP matches. For now we assume success since it's just frontend state.
    try {
      let cleanedPhone = phone.replace(/\D/g, "");
      if (cleanedPhone.length === 10) cleanedPhone = "91" + cleanedPhone;

      await mongoose.connection.db?.collection("customers").updateOne(
        { phone: cleanedPhone },
        { 
          $set: { lastLogin: new Date().toISOString() }, 
          $setOnInsert: { createdAt: new Date().toISOString() } 
        },
        { upsert: true }
      );
      res.json({ success: true, token: "mock-jwt-token" });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to verify user" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Spice Kraft Server running on http://localhost:${PORT}`);
  });
}

startServer();
