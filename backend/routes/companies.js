// backend/routes/companies.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/companies
router.get('/', async (req, res) => {
  try {
    const { search, status, industry, assigned } = req.query;
    const companies = await db.getCompanies({ search, status, industry, assigned });
    res.json({ success: true, data: companies, total: companies.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/companies/stats  — must come BEFORE /:id
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/companies/reset  — must come BEFORE /:id
router.post('/reset', async (req, res) => {
  try {
    const count = await db.resetToDemo();
    res.json({ success: true, message: `Demo data restored (${count} companies)` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/companies/:id
router.get('/:id', async (req, res) => {
  try {
    const company = await db.getCompanyById(Number(req.params.id));
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/companies
router.post('/', async (req, res) => {
  try {
    const { company } = req.body;
    if (!company || !company.trim()) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }
    const created = await db.createCompany(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/companies/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.getCompanyById(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Company not found' });
    const updated = await db.updateCompany(id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/companies/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db.deleteCompany(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Company not found' });
    res.json({ success: true, message: `${deleted.company} deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;