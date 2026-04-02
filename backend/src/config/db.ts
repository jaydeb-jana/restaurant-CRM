import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/jaydbapp";

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
