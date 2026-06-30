// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || 'change-this-secret-in-production';

// LOGIN
router.post('/login', (req, res) => {
  const { password } = req.body;

  let role = '';

  if (password === 'admin123') {
    role = 'admin';
  } else if (password === 'employee123') {
    role = 'employee';
  } else {
    return res.status(401).json({
      success: false,
      error: 'Incorrect password'
    });
  }

  const token = jwt.sign(
    {
      app: 'cot-tracker',
      role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    token,
    role
  });
});

// VERIFY TOKEN
router.post('/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false
    });
  }

  try {
    jwt.verify(token, JWT_SECRET);

    res.json({
      success: true
    });
  } catch {
    res.status(401).json({
      success: false
    });
  }
});

module.exports = router;