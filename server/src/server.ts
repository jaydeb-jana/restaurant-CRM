import express, { Request, Response, Application } from "express";
import "module-alias/register";
import { connectDB } from "./config/db";
import { initWhatsApp } from "./config/whatsapp";
import apiRoutes from "./routes/api";
import { setupSecurity } from "./middleware/security";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env.config";
import getBranding from "./config/branding";

async function startServer() {

  const app: Application = express();
  const PORT = env.PORT || 3000;

  // Security Hardening
  setupSecurity(app);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
  // Database Connection
  await connectDB();

  // WhatsApp Initialization
  initWhatsApp();

  // Versioned API Routes
  app.use("/api/v1", apiRoutes);

  // Health check
  app.get("/health", (req: Request, res: Response) => {
    res.json({ 
      success: true, 
      status: "up", 
      version: "v1",
      timestamp: new Date().toISOString()
    });
  });

  // Global Error Handler (Must be last)
  app.use(errorHandler);

  app.listen(PORT, () => {
    const branding = getBranding();
    console.log(`🚀 ${branding.name} Enterprise Server running on http://localhost:${PORT}`);
    console.log(`📁 API Version v1: http://localhost:${PORT}/api/v1`);
  });

}

startServer();
