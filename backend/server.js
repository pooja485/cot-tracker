// backend/server.js — COT Tracker API Server v2.1
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const { initDB } = require('./db');
const requireAuth = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// ── Middleware ────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────
// Strict limit on login to prevent brute-force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many login attempts, try again in 15 minutes.' },
});

// General API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);

// ── Static Frontend ───────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ── Public routes (no auth required) ─────────────────
app.use('/api/auth', require('./routes/auth'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.1.0', timestamp: new Date().toISOString() });
});

// ── Protected routes (auth required) ─────────────────
app.use('/api/upload',    requireAuth, require('./routes/upload'));
app.use('/api/companies', requireAuth, require('./routes/companies'));
app.use('/api/activity',  requireAuth, require('./routes/activity'));

// ── SPA fallback ──────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ── Error handlers ────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────
initDB().then(async () => {
  const { getCompanies, resetToDemo } = require('./db');
  const existing = await getCompanies();
  if (existing.length === 0) {
    console.log('📦 Empty database — seeding demo data...');
    await resetToDemo();
    console.log('✅ Demo data seeded');
  }

  app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   COT — Company Outreach Tracker v2.1  ║');
    console.log(`║   Running at http://localhost:${PORT}     ║`);
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log(`  APP_PASSWORD : ${process.env.APP_PASSWORD ? '(set via env)' : 'cot2024 (default — change this!)'}`);
    console.log('');
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});