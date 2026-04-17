import mongoose from "mongoose";
import getBranding from "./branding.js";
import { env } from "./env.config.js";

const MONGODB_URI = env.MONGODB_URI;

// Initial data structure for seeding
const INITIAL_DB = {
  menuItems: [],
  categories: ["Main Course", "Appetizers", "Beverages", "Desserts"],
  orders: [],
  tables: [],
  settings: {
    id: "app-settings",
    isOpen: true,
    whatsappConnected: true
  }
};

async function seedDatabase() {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const menuCount = await db.collection("menuItems").countDocuments();
    if (menuCount === 0 && INITIAL_DB.menuItems.length > 0) {
      console.log("Seeding initial menu items...");
      await db.collection("menuItems").insertMany(INITIAL_DB.menuItems);
    }

    const categoryCount = await db.collection("categories").countDocuments();
    if (categoryCount === 0 && INITIAL_DB.categories.length > 0) {
      console.log("Seeding initial categories...");
      const categoryDocs = INITIAL_DB.categories.map((name, i) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        order: i
      }));
      await db.collection("categories").insertMany(categoryDocs);
    }

    const tableCount = await db.collection("tables").countDocuments();
    if (tableCount === 0 && INITIAL_DB.tables.length > 0) {
      console.log("Seeding initial tables...");
      await db.collection("tables").insertMany(INITIAL_DB.tables);
    }
    console.log("Database seed check completed.");

    // Always sync branding from environment to DB settings
    const branding = getBranding();
    await db.collection("settings").updateOne(
      { id: "app-settings" },
      { $set: { restaurantName: branding.name } },
      { upsert: true }
    );
    console.log(`Synced branding: ${branding.name}`);

  } catch (err) {
    console.error("Error seeding database:", err);
  }
}

export const connectDB = async () => {
  try {
    console.log(`Attempting to connect to: ${MONGODB_URI.replace(/:([^:@]+)@/, ':****@')}`);
    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to MongoDB: ${mongoose.connection.host}`);
    await seedDatabase();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
};
