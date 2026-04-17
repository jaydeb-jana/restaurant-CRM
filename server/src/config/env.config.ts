import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().url({ message: "Invalid MONGODB_URI" }),
  JWT_SECRET: z.string().min(32, { message: "JWT_SECRET must be at least 32 characters" }),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  APP_NAME: z.string().default('Jaydevb Kraft'),
  APP_SHORT_NAME: z.string().default('JaydevbKraft'),
  APP_EMAIL: z.string().email().default('hello@jaydevbkraft.com'),
  APP_PHONE: z.string().default('+91 98765 43210'),
});

const envVars = envSchema.safeParse(process.env);

if (!envVars.success) {
  console.error('❌ Invalid environment variables:', envVars.error.format());
  process.exit(1);
}

export const env = envVars.data;
