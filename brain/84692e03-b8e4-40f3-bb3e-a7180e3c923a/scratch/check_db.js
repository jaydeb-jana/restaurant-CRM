const mongoose = require('mongoose');

async function checkCollections() {
  await mongoose.connect('mongodb+srv://restaurant-crm:restaurant-crm@cluster0.oiajbkb.mongodb.net/restaurant_crm?retryWrites=true&w=majority&appName=Cluster0'); 
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  for (const coll of collections) {
    const count = await db.collection(coll.name).countDocuments();
    console.log(`Collection: ${coll.name}, Count: ${count}`);
    if (count > 0) {
      const sample = await db.collection(coll.name).findOne();
      console.log(`Sample from ${coll.name}:`, JSON.stringify(sample, null, 2));
    }
  }
  process.exit();
}

checkCollections();
