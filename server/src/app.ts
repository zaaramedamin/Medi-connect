import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { apiRateLimit, assistantRateLimit } from './middleware/rateLimit';
import { requestLog } from './middleware/requestLog';
import { logger, captureError } from './services/logger';
import doctorRoutes from './routes/doctors';
import appointmentRoutes from './routes/appointments';
import uploadRoutes from './routes/uploads';
import reviewRoutes from './routes/reviews';
import adminRoutes from './routes/admin';
import articleRoutes from './routes/articles';
import orderRoutes from './routes/orders';
import profileRoutes from './routes/profile';
import recordRoutes from './routes/records';
import patientLimitRoutes from './routes/patientLimits';
import assistantRoutes from './routes/assistant';
import { processReminders } from './services/reminderService';
import { processNoShows } from './services/patientLimits';

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

// Structured request logging (request-id + timing, no bodies — PHI-safe)
app.use(requestLog);

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
app.use('/api/records', recordRoutes);
app.use('/api/patient-limits', patientLimitRoutes);
app.use('/api/assistant', assistantRateLimit, assistantRoutes);

// Health check — enough for an uptime monitor to alert on and to confirm which
// build is live.
const STARTED_AT = Date.now();
app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    uptime_s: Math.round((Date.now() - STARTED_AT) / 1000),
    version: process.env.npm_package_version ?? 'dev',
    time: new Date().toISOString(),
  })
);

// External-cron hook for reminders. On hosts whose free tiers sleep idle
// services, the in-process interval below never fires — point a scheduler
// (GitHub Actions cron, cron-job.org, UptimeRobot) here every 15 minutes.
app.post('/api/jobs/reminders', async (req, res) => {
  const token = process.env.JOB_TOKEN;
  if (!token || req.headers['x-job-token'] !== token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  await processReminders();
  await processNoShows();
  res.json({ status: 'ok' });
});

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler — logs with the request id and returns it so a user can
// quote it in a report without the server leaking internals.
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  captureError(err, { id: req.id, method: req.method, path: req.path, user: req.user?.id });
  res.status(500).json({ error: 'Internal server error', request_id: req.id });
});

// Last-resort guards: an unhandled rejection or exception should be logged
// structured, not crash silently.
process.on('unhandledRejection', reason => captureError(reason, { kind: 'unhandledRejection' }));
process.on('uncaughtException', err => captureError(err, { kind: 'uncaughtException' }));

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  logger.info('API started', { port: Number(PORT), version: process.env.npm_package_version ?? 'dev' });

  // Background jobs: check once on boot, then every 15 minutes. Reminders no-op
  // until RESEND_API_KEY is set; no-show detection always runs (ungated by email)
  // and is idempotent (it only flips a still-confirmed row once).
  const runJobs = () => { processReminders(); processNoShows(); };
  runJobs();
  setInterval(runJobs, 15 * 60 * 1000);
});

export default app;
