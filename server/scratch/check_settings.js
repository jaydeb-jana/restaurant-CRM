import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const settings = await mongoose.connection.db.collection('settings').findOne({ id: 'app-settings' });
  console.log('--- AI SETTINGS ---');
  console.log('Global AI Active:', settings?.globalAiActive);
  console.log('Active Bot Sessions:', settings?.activeBotSessions);
  console.log('Models:', settings?.aiModel);
  console.log('Groq Key exists:', !!settings?.groqApiKey);
  console.log('-------------------');
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
