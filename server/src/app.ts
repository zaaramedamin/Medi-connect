import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { apiRateLimit } from './middleware/rateLimit';
import doctorRoutes from './routes/doctors';
import appointmentRoutes from './routes/appointments';
import uploadRoutes from './routes/uploads';
import reviewRoutes from './routes/reviews';
import adminRoutes from './routes/admin';
import articleRoutes from './routes/articles';
import orderRoutes from './routes/orders';
import profileRoutes from './routes/profile';
import { processReminders } from './services/reminderService';

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
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// External-cron hook for reminders. On hosts whose free tiers sleep idle
// services, the in-process interval below never fires — point a scheduler
// (GitHub Actions cron, cron-job.org, UptimeRobot) here every 15 minutes.
app.post('/api/jobs/reminders', async (req, res) => {
  const token = process.env.JOB_TOKEN;
  if (!token || req.headers['x-job-token'] !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  await processReminders();
  res.json({ status: 'ok' });
});

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

  // Appointment reminders: check once on boot, then every 15 minutes.
  // No-ops until a real RESEND_API_KEY is set. Deduped via reminder_logs.
  processReminders();
  setInterval(processReminders, 15 * 60 * 1000);
});

export default app;
