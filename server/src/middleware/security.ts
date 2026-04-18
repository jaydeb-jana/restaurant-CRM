import { Application } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import { env } from '../config/env.config.js';

export const setupSecurity = (app: Application) => {
  // Set security HTTP headers
  app.use(helmet());

  // CORS configuration
  // const corsOptions = {
  //   origin: env.CLIENT_URL,
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  // };
  // app.use(cors(corsOptions));
  
  // Temporarily allow all origins
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Limit requests from same API
  const limiter = rateLimit({
    max: 1000, // Increased to allow dashboard polling
    windowMs: 15 * 60 * 1000, 
    message: 'Too many requests from this IP, please try again in 15 minutes!',
  });
  app.use('/api', limiter);

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());

  // Data sanitization against XSS
  app.use(xss());
};
