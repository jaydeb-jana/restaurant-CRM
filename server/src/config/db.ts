import mongoose from "mongoose";
import getBranding from "./branding";
import { env } from "./env.config";

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
      console.log("Database seeded successfully.");
    }

    // Always sync branding from JSON to DB settings
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
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully locally");
    await seedDatabase();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
};
