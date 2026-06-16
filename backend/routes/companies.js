// backend/routes/companies.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── GET /api/companies — list with optional filters
router.get('/', (req, res) => {
  try {
    const { search, status, industry, assigned } = req.query;
    const companies = db.getCompanies({ search, status, industry, assigned });
    res.json({ success: true, data: companies, total: companies.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/companies/stats — aggregate statistics
router.get('/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/companies/:id — single company
router.get('/:id', (req, res) => {
  try {
    const company = db.getCompanyById(Number(req.params.id));
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/companies — create new company
router.post('/', (req, res) => {
  try {
    const { company } = req.body;
    if (!company || !company.trim()) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }
    const created = db.createCompany(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/companies/:id — update company
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.getCompanyById(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Company not found' });
    const updated = db.updateCompany(id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/companies/:id — delete company
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = db.deleteCompany(id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Company not found' });
    res.json({ success: true, message: `${deleted.company} deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
