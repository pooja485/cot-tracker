const express = require('express');
const router = express.Router();
const { pool } = require('../db');

function generateId() {
  return 'co_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

router.get('/stats', async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM companies');
    const contacted = await pool.query(`SELECT COUNT(*) FROM companies WHERE status != 'Not Contacted'`);
    const emailSent = await pool.query(`SELECT COUNT(*) FROM companies WHERE status IN ('Email Sent','Replied','Interested','Data Sent','Follow-up Sent')`);
    const replied = await pool.query(`SELECT COUNT(*) FROM companies WHERE status IN ('Replied','Interested','Data Sent','Follow-up Sent')`);
    const interested = await pool.query(`SELECT COUNT(*) FROM companies WHERE status IN ('Interested','Data Sent','Follow-up Sent')`);
    const dataSent = await pool.query(`SELECT COUNT(*) FROM companies WHERE status IN ('Data Sent','Follow-up Sent')`);
    const followUp = await pool.query(`SELECT COUNT(*) FROM companies WHERE status = 'Follow-up Sent'`);
    const noReply = await pool.query(`SELECT COUNT(*) FROM companies WHERE status = 'No Reply'`);
    const byIndustry = await pool.query('SELECT industry, COUNT(*) as count FROM companies GROUP BY industry');
    const t = parseInt(total.rows[0].count);
    const c = parseInt(contacted.rows[0].count);
    res.json({
      total: t,
      contacted: c,
      emailSent: parseInt(emailSent.rows[0].count),
      replied: parseInt(replied.rows[0].count),
      interested: parseInt(interested.rows[0].count),
      dataSent: parseInt(dataSent.rows[0].count),
      followupSent: parseInt(followUp.rows[0].count),
      noReply: parseInt(noReply.rows[0].count),
      contactedPercent: t > 0 ? Math.round((c/t)*100) : 0,
      industries: byIndustry.rows.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, priority, industry, search } = req.query;
    let query = 'SELECT * FROM companies WHERE 1=1';
    const params = [];
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    if (priority) { params.push(priority); query += ` AND priority = $${params.length}`; }
    if (industry) { params.push(industry); query += ` AND industry = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (name ILIKE $${params.length} OR contact_name ILIKE $${params.length} OR contact_email ILIKE $${params.length})`; }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = generateId();
    const name = req.body.name || req.body.companyName || req.body.company_name;
    const industry = req.body.industry;
    const website = req.body.website;
    const contact_name = req.body.contact_name || req.body.contactPerson || req.body.contact_person;
    const contact_email = req.body.contact_email || req.body.email;
    const contact_phone = req.body.contact_phone || req.body.phone;
    const status = req.body.status;
    const priority = req.body.priority;
    const notes = req.body.notes;
    const last_contacted = req.body.last_contacted || req.body.lastContacted;
    const follow_up_date = req.body.follow_up_date || req.body.nextFollowup || req.body.next_followup;
    const deal_value = req.body.deal_value;
    const tags = req.body.tags;
    const result = await pool.query(
      `INSERT INTO companies (id, name, industry, website, contact_name, contact_email,
        contact_phone, status, priority, notes, last_contacted, follow_up_date, deal_value, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [id, name, industry, website, contact_name, contact_email,
        contact_phone, status || 'Not Contacted', priority || 'Medium',
        notes, last_contacted || null, follow_up_date || null, deal_value || null, tags]
    );
    await pool.query(
      'INSERT INTO activity (company_id, company_name, action, details) VALUES ($1,$2,$3,$4)',
      [id, name, 'created', `Company "${name}" added to pipeline`]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, industry, website, contact_name, contact_email, contact_phone,
      status, priority, notes, last_contacted, follow_up_date, deal_value, tags } = req.body;
    const result = await pool.query(
      `UPDATE companies SET name=$1, industry=$2, website=$3, contact_name=$4,
        contact_email=$5, contact_phone=$6, status=$7, priority=$8, notes=$9,
        last_contacted=$10, follow_up_date=$11, deal_value=$12, tags=$13, updated_at=NOW()
       WHERE id=$14 RETURNING *`,
      [name, industry, website, contact_name, contact_email, contact_phone,
        status, priority, notes, last_contacted || null, follow_up_date || null,
        deal_value || null, tags, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await pool.query(
      'INSERT INTO activity (company_id, company_name, action, details) VALUES ($1,$2,$3,$4)',
      [req.params.id, name, 'updated', `Company "${name}" was updated`]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const company = await pool.query('SELECT name FROM companies WHERE id = $1', [req.params.id]);
    if (company.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM companies WHERE id = $1', [req.params.id]);
    await pool.query(
      'INSERT INTO activity (company_id, company_name, action, details) VALUES ($1,$2,$3,$4)',
      [req.params.id, company.rows[0].name, 'deleted', `Company "${company.rows[0].name}" removed`]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;