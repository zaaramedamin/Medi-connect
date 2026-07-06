import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { apiRateLimit } from './middleware/rateLimit';
import doctorRoutes from './routes/doctors';
import appointmentRoutes from './routes/appointments';
import uploadRoutes from './routes/uploads';

const app = express();

// Security headers — CSP is enabled because React has no inline scripts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://*.supabase.co'],
        connectSrc: ["'self'", process.env.SUPABASE_URL ?? ''],
      },
    },
  })
);

// CORS — allow the React dev server and the production client origin
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_ORIGIN ?? '',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' })); // 10 MB to support base64 photo uploads
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use('/api', apiRateLimit);

// Routes
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`MediConnect API running on port ${PORT}`);
});

export default app;
