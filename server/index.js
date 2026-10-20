import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import { loadStore } from './lib/store.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(v => v.trim()).filter(Boolean);
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('Origin is not allowed by CORS.')); }, methods: ['GET','POST','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '2mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'guestpass-pro-api', mode: process.env.NODE_ENV || 'development' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }), authRoutes);
app.use('/api/events', eventRoutes);
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use((err, _req, res, _next) => {
  if (err.message === 'Origin is not allowed by CORS.') return res.status(403).json({ error: 'Origin is not allowed by CORS.' });
  const status = Number(err.status || err.statusCode);
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    const safeMessage = status === 413 ? 'Request body is too large.' : status === 400 ? 'The request could not be parsed.' : 'The request could not be completed.';
    return res.status(status).json({ error: safeMessage });
  }
  console.error('Unhandled API error:', err);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

const port = Number(process.env.PORT || 8787);
if (process.env.NODE_ENV !== 'test') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('Set JWT_SECRET to a random value of at least 32 characters in .env.'); process.exit(1);
  }
  await loadStore();
  app.listen(port, () => console.log(`GuestPass Pro API listening on http://localhost:${port}`));
}
export default app;
