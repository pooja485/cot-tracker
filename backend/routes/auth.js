// backend/routes/auth.js — Simple JWT authentication
const express = require('express');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

const JWT_SECRET  = process.env.JWT_SECRET  || 'change-this-secret-in-production';
const APP_PASSWORD = process.env.APP_PASSWORD || 'cot2024';

// POST /api/auth/login  { password }
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!password || password !== APP_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Incorrect password' });
  }

  const token = jwt.sign({ app: 'cot-tracker' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
});

// POST /api/auth/verify  — lets frontend silently validate a stored token
router.post('/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false });
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ success: true });
  } catch {
    res.status(401).json({ success: false });
  }
});

module.exports = router;