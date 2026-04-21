import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import getBranding from "../config/branding.js";

const maskApiKey = (key: string) => {
  if (!key) return "";
  if (key.length <= 12) return "****************";
  return `${key.slice(0, 6)}****************${key.slice(-4)}`;
};


export const getCollection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { collection } = req.params;
    let query = mongoose.connection.db?.collection(collection).find({});
    
    // Auto-sort by timestamp or createdAt if available
    if (collection === "whatsapp_messages" || collection === "broadcast_history") {
      query = query?.sort({ timestamp: -1 });
    }

    const data = await query?.toArray();
    const formatted = data?.map(doc => {
      const { _id, ...rest } = doc;
      return rest;
    }) || [];
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Database read error" });
  }
};

export const createItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { collection } = req.params;
    const { id, ...data } = req.body;
    
    if (id) {
       // Support Upsert if ID is provided
       await mongoose.connection.db?.collection(collection).updateOne(
         { id },
         { $set: { id, ...data } },
         { upsert: true }
       );
       return res.json({ id, ...data });
    }

    const newItem = { id: Date.now().toString(), ...req.body };
    await mongoose.connection.db?.collection(collection).insertOne(newItem);
    const { _id, ...rest } = newItem as any;
    res.json(rest);
  } catch (error) {
    res.status(500).json({ error: "Database write error" });
  }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
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
};

export const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { collection, id } = req.params;
    await mongoose.connection.db?.collection(collection).deleteOne({ id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Database delete error" });
  }
};

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" });
    
    // Merge database settings (delays, AI params) with JSON branding config
    const branding = getBranding();
    const mergedSettings = {
      id: "app-settings",
      ...settings, // Include all existing DB settings (minDelay, aiAgentName, etc.)
      isOpen: settings?.isOpen ?? true,
      whatsappConnected: settings?.whatsappConnected ?? false,
      // Priority branding overrides if needed
      restaurantName: branding.name || settings?.restaurantName || "Spice Kraft",
      ...branding 
    };

    const { _id, ...cleanSettings } = mergedSettings as any;
    
    // Mask sensitive keys
    if (cleanSettings.groqApiKey) {
      cleanSettings.groqApiKey = maskApiKey(cleanSettings.groqApiKey);
    }

    res.json(cleanSettings);
  } catch (error) {
    res.status(500).json({ error: "Settings read error" });
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updateData = { ...req.body };

    // If the API key is masked, don't update it in the DB
    if (updateData.groqApiKey && updateData.groqApiKey.includes("****")) {
      delete updateData.groqApiKey;
    }

    const updateResult = await mongoose.connection.db?.collection("settings").findOneAndUpdate(
      { id: "app-settings" },
      { $set: updateData },
      { returnDocument: "after", upsert: true }
    );

    if (updateResult) {
      // Handle both old and new MongoDB driver return formats (value property vs direct doc)
      const resultDoc = (updateResult as any).value || updateResult;
      
      if (resultDoc && typeof resultDoc === 'object') {
        if (resultDoc.groqApiKey) {
          resultDoc.groqApiKey = maskApiKey(resultDoc.groqApiKey);
        }
        const { _id, ...rest } = resultDoc;
        return res.json(rest);
      }
    }
    
    // Fallback response
    res.json({ id: "app-settings", ...updateData });
  } catch (error) {
    console.error("Settings update error:", error);
    res.status(500).json({ error: "Settings update error" });
  }
};
