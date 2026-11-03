import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

const app: Application = express();

// Trust Render/Vercel proxy headers so rate limiting sees the real client IP.
app.set('trust proxy', 1);

// 1. HTTP Security Headers
app.use(helmet());

// 2. Cross-Origin Resource Sharing
const allowedOrigins = [
  process.env.CLIENT_URL,
  'finance-tracker-client-eight.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowedOrigin =
        allowedOrigins.includes(origin) ||
        /^https?:\/\/.*\.vercel\.app$/.test(origin) ||
        /^https?:\/\/.*\.onrender\.com$/.test(origin);

      if (isAllowedOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// 3. Rate Limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// 4. Request Body Parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Health Check
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'Finance Tracker API',
    status: 'ok',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      transactions: '/api/transactions',
      summary: '/api/summary',
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Finance Tracker API',
    timestamp: new Date().toISOString(),
  });
});

// 6. Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api', requireAuth, analyticsRoutes); // Handles /api/summary and /api/cash-flow.
app.use('/api/analytics', requireAuth, analyticsRoutes);

// 7. 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// 8. Centralized Global Error Handler (Must be registered last)
app.use(errorHandler);

export default app;

