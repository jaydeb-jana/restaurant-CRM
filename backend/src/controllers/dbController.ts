import { Request, Response } from "express";
import mongoose from "mongoose";

export const getCollection = async (req: Request, res: Response) => {
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
};

export const createItem = async (req: Request, res: Response) => {
  try {
    const { collection } = req.params;
    const newItem = { id: Date.now().toString(), ...req.body };
    await mongoose.connection.db?.collection(collection).insertOne(newItem);
    const { _id, ...rest } = newItem as any;
    res.json(rest);
  } catch (error) {
    res.status(500).json({ error: "Database write error" });
  }
};

export const updateItem = async (req: Request, res: Response) => {
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

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const { collection, id } = req.params;
    await mongoose.connection.db?.collection(collection).deleteOne({ id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Database delete error" });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await mongoose.connection.db?.collection("settings").findOne({ id: "app-settings" });
    if (settings) {
      const { _id, ...rest } = settings;
      res.json(rest);
    } else {
      res.json({
        id: "app-settings",
        isOpen: true,
        whatsappConnected: false,
        restaurantName: "Spice Kraft"
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Settings read error" });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
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
};
