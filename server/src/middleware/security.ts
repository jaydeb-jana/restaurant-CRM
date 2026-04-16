import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
// @ts-ignore
import xss from 'xss-clean';

export const setupSecurity = (app: any) => {
  // Set security HTTP headers
  app.use(helmet());

  // CORS configuration
  const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
  app.use(cors(corsOptions));

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
