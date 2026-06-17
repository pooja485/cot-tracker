// backend/routes/activity.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 15, 50);
    const log = await db.getActivityLog(limit);
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;