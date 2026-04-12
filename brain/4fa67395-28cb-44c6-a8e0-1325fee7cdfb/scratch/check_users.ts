import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../../server/.env") });

async function checkUsers() {
    try {
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant-crm";
        await mongoose.connect(uri);
        const users = await mongoose.connection.db?.collection("users").find({}).toArray();
        console.log(JSON.stringify(users, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkUsers();
