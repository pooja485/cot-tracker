// backend/server.js — COT Tracker API Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // CSP off so frontend fonts/CDN load
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/upload', require('./routes/upload'));
app.use(express.urlencoded({ extended: true }));

// ── Static Frontend ───────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ── API Routes ────────────────────────────────────────
app.use('/api/companies', require('./routes/companies'));
app.use('/api/activity',  require('./routes/activity'));

// ── Health check ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── SPA fallback (serve index.html for all non-API routes) ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// ── 404 / Error handlers ─────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║   COT — Company Outreach Tracker       ║');
    console.log(`║   Running at http://localhost:${PORT}     ║`);
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log('  API Endpoints:');
    console.log('  GET    /api/companies         → list all');
    console.log('  POST   /api/companies         → create');
    console.log('  GET    /api/companies/:id     → single');
    console.log('  PUT    /api/companies/:id     → update');
    console.log('  DELETE /api/companies/:id     → delete');
    console.log('  GET    /api/companies/stats   → analytics');
    console.log('  GET    /api/activity          → activity log');
    console.log('  GET    /api/health            → health check');
    console.log('');
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});
