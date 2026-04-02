import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db";
import { initWhatsApp } from "./config/whatsapp";
import apiRoutes from "./routes/api";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Dynamic CORS Implementation
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:3000"
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  }));

  app.use(express.json());
  
  // Database Connection
  await connectDB();

  // WhatsApp Initialization
  initWhatsApp();

  // Versioned API Routes
  app.use("/api/v1", apiRoutes);

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "up", version: "v1" });
  });

  app.listen(PORT, () => {
    console.log(`🚀 Spice Kraft Backend running on http://localhost:${PORT}`);
    console.log(`📁 Versioned API: http://localhost:${PORT}/api/v1`);
  });
}

startServer();
