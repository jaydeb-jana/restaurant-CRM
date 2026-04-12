import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../../server/.env") });

async function fixUsersData() {
    try {
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant-crm";
        await mongoose.connect(uri);
        const db = mongoose.connection.db;
        const users = await db?.collection("users").find({}).toArray();
        
        console.log(`Checking ${users?.length} users...`);

        if (users) {
            for (const user of users) {
                const update: any = {};
                let changed = false;

                for (const [key, value] of Object.entries(user)) {
                    if (typeof value === 'string' && value.endsWith(',')) {
                        update[key] = value.slice(0, -1);
                        changed = true;
                        console.log(`Fixing field [${key}] for user ${user.id}: "${value}" -> "${update[key]}"`);
                    }
                }

                if (changed) {
                    await db?.collection("users").updateOne({ _id: user._id }, { $set: update });
                }
            }
        }

        console.log("Database cleanup complete.");
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

fixUsersData();
