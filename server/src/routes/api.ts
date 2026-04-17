import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import * as dbController from "../controllers/dbController.js";
import * as whatsappController from "../controllers/whatsappController.js";
import * as authController from "../controllers/authController.js";

import { getBranding } from "../config/branding.js";


const router = Router();

// Health check
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Generic DB Routes

router.get("/db/:collection", dbController.getCollection);
router.post("/db/:collection", dbController.createItem);
router.put("/db/:collection/:id", dbController.updateItem);
router.delete("/db/:collection/:id", dbController.deleteItem);

// Settings Routes
router.get("/settings", dbController.getSettings);
router.put("/settings", dbController.updateSettings);

// WhatsApp Routes
router.get("/whatsapp/status", whatsappController.getStatus);
router.post("/whatsapp/connect", whatsappController.connect);
router.post("/whatsapp/register", whatsappController.register);
router.post("/whatsapp/pairing-code", whatsappController.requestPairingCode);
router.post("/whatsapp/set-primary", whatsappController.setPrimary);
router.post("/whatsapp/disconnect", whatsappController.disconnect);
router.post("/whatsapp/send-test", whatsappController.sendTest);
router.get("/whatsapp/customers", whatsappController.getCustomers);
router.post("/whatsapp/bulk-send", whatsappController.bulkSend);

// Auth Routes
router.post("/auth/whatsapp/otp", authController.sendOTP);
router.post("/auth/whatsapp/verify", authController.verifyOTP);

export default router;
