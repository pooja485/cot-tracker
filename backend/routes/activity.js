const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET activity log
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const result = await pool.query(
      'SELECT * FROM activity ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;