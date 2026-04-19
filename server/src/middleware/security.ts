import { Application } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import { env } from '../config/env.config.js';

export const setupSecurity = (app: Application) => {
  // Set security HTTP headers
  // Set security HTTP headers with relaxed COOP/CORP for development
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" }
  }));

  // CORS configuration
  // const corsOptions = {
  //   origin: env.CLIENT_URL,
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  // };
  // app.use(cors(corsOptions));
  
  // Temporarily allow all origins, but explicitly include the live site
  app.use(cors({
    origin: [
      env.CLIENT_URL, 
      "https://restaurant-crm-1-lg0o.onrender.com",
      "http://localhost:5173",
      "http://localhost:5174"
    ],
    credentials: true
  }));

  // Limit requests from same API
  const limiter = rateLimit({
    max: 2000, // Increased for dashboard polling
    windowMs: 15 * 60 * 1000, 
    message: 'Too many requests from this IP, please try again in 15 minutes!',
    validate: { trustProxy: false }, // Critical fix for the ValidationError
  });
  app.use('/api', limiter);

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());

  // Data sanitization against XSS
  app.use(xss());
};
