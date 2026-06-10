const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'cot2026';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cot-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Login page
app.get('/login', (req, res) => {
  if (req.session.loggedIn) return res.redirect('/');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>COT — Login</title>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #f4f6fb; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .card { background: white; padding: 48px 40px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); width: 100%; max-width: 400px; }
        .logo { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
        .logo-icon { width: 40px; height: 40px; background: #2255d4; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; }
        .logo-text h1 { font-size: 18px; font-weight: 600; color: #1a2236; }
        .logo-text p { font-size: 13px; color: #6b7a99; }
        h2 { font-size: 22px; font-weight: 600; color: #1a2236; margin-bottom: 8px; }
        p.sub { font-size: 14px; color: #6b7a99; margin-bottom: 28px; }
        label { display: block; font-size: 13px; font-weight: 500; color: #1a2236; margin-bottom: 6px; }
        input { width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f4; border-radius: 8px; font-size: 15px; font-family: inherit; outline: none; transition: border 0.2s; }
        input:focus { border-color: #2255d4; }
        button { width: 100%; padding: 13px; background: #2255d4; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; margin-top: 20px; transition: background 0.2s; }
        button:hover { background: #1a44b8; }
        .error { background: #fef2f2; color: #dc2626; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 20px; display: ${req.query.error ? 'block' : 'none'}; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">
          <div class="logo-icon">COT</div>
          <div class="logo-text"><h1>COT Tracker</h1><p>Outreach Pipeline</p></div>
        </div>
        <h2>Welcome back</h2>
        <p class="sub">Enter your team password to continue</p>
        <div class="error">Incorrect password. Please try again.</div>
        <form method="POST" action="/login">
          <label>Team Password</label>
          <input type="password" name="password" placeholder="Enter team password" autofocus required/>
          <button type="submit">Sign In</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

// Login POST
app.post('/login', (req, res) => {
  if (req.body.password === TEAM_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect('/');
  } else {
    res.redirect('/login?error=1');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Auth middleware
function requireLogin(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect('/login');
}

// Static frontend — protected
app.use(requireLogin, express.static(path.join(__dirname, '../frontend/public')));

// API Routes — protected
app.use('/api/companies', requireLogin, require('./routes/companies'));
app.use('/api/activity', requireLogin, require('./routes/activity'));

// Health check — public
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ PostgreSQL database ready`);
    console.log(`╔════════════════════════════════════════╗`);
    console.log(`║   COT — Company Outreach Tracker       ║`);
    console.log(`║   Running at http://localhost:${PORT}     ║`);
    console.log(`╚════════════════════════════════════════╝`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});