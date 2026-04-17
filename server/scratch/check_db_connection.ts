import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI;

async function checkDB() {
    if (!uri) {
        console.error('MONGODB_URI not found in .env');
        process.exit(1);
    }
    console.log('Connecting to:', uri.replace(/:([^:@]+)@/, ':****@'));
    try {
        await mongoose.connect(uri);
        console.log('Successfully connected to MongoDB');
        
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('Databases on this cluster:', dbs.databases.map(d => d.name));

        for (const dbInfo of dbs.databases) {
            console.log(`\n--- Checking Database: ${dbInfo.name} ---`);
            const conn = mongoose.createConnection(`${uri.split('?')[0].replace(/\/[^\/]*$/, '/')}${dbInfo.name}?${uri.split('?')[1] || ''}`);
            await new Promise(resolve => conn.once('open', resolve));
            const collections = await conn.db.listCollections().toArray();
            console.log(`Collections in ${dbInfo.name}:`, collections.map(c => c.name));
            for (const col of collections) {
                 const count = await conn.db.collection(col.name).countDocuments();
                 console.log(`  - ${col.name}: ${count} docs`);
            }
            await conn.close();
        }

    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDB();
