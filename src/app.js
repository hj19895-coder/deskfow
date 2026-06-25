import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

 
import ticketRoutes     from './routes/ticket.routes.js';
import authRoutes       from './routes/auth.routes.js';
import masterDataRoutes from './routes/masterData.routes.js';
import userRoutes       from './routes/user.routes.js';
import tablePreferenceRoutes from './routes/tablePreference.routes.js';
import roleRoutes            from './routes/role.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import logger from './config/logger.js';
import { PrismaClient } from '@prisma/client';
import reportsRouter from "./routes/reports.js";

 
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
 
const prisma = new PrismaClient();
 
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
const BASE_PORT        = parseInt(process.env.PORT, 10) || 3000;
const MAX_PORT_ATTEMPTS = 10;
 
// ── Security ──────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:    ["'self'"],
        scriptSrc:     ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc:      ["'self'", "'unsafe-inline'"],
      },
    },
  })
);
 
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://deskfloww.netlify.app"
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Blocked by CORS"));
    }
  },
  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS"
  ],
  credentials: true
}));

app.options("*", cors());
 
// ── Rate limiting ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
});
 
// ── General middleware ────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip:   (req) => req.path === '/health',
}));
 
// ── Serve frontend ────────────────────────────────────────────────────────────
 
// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/tickets',          ticketRoutes);
app.use('/api/auth',             authRoutes);
app.use('/api/master-data',    masterDataRoutes);   // ← new
app.use('/api/users',           userRoutes);
app.use('/api',                 tablePreferenceRoutes);
app.use('/api/roles',           roleRoutes);
app.use('/api/reports',          reportsRouter); 

 
// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});
 
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "DeskFlow API running"
  });
});
// ── Error handlers ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);
 
// ── Start ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await prisma.$connect();
    logger.info('Prisma connected successfully');
  } catch (err) {
    logger.error('Cannot connect to database — aborting startup', { err: err.message });
    process.exit(1);
  }
 
  function tryNextPort(port, attempts = 0) {
    if (attempts > MAX_PORT_ATTEMPTS) {
      logger.error(`Could not start server — all ports from ${BASE_PORT} to ${BASE_PORT + MAX_PORT_ATTEMPTS} in use`);
      process.exit(1);
      return;
    }
 
    const server = app.listen(port, () => {
      logger.info(`🚀 Server running on http://localhost:${port}`);
      logger.info(`    Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`    Database   : ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@')}`);
    });
 
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`Port ${port} in use, trying ${port + 1}…`);
        server.close(() => tryNextPort(port + 1, attempts + 1));
      } else {
        logger.error('Server error:', err.message);
        process.exit(1);
      }
    });
  }
 
  tryNextPort(BASE_PORT);
})();
 
// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
 
export default app;