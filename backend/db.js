// backend/db.js - Database layer using sql.js (in-memory + file persistence)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/cot.db');
const DATA_DIR = path.join(__dirname, '../data');

let db = null;
let SQL = null;

// ── Schema ─────────────────────────────────────────────
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS companies (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    company       TEXT    NOT NULL,
    city          TEXT    DEFAULT '',
    industry      TEXT    DEFAULT 'Technology',
    contact       TEXT    DEFAULT '',
    email         TEXT    DEFAULT '',
    phone         TEXT    DEFAULT '',
    status        TEXT    DEFAULT 'Not Contacted',
    email_sent    INTEGER DEFAULT 0,
    reply         INTEGER DEFAULT 0,
    interested    INTEGER DEFAULT 0,
    data_sent     INTEGER DEFAULT 0,
    msg_sent      INTEGER DEFAULT 0,
    followup      INTEGER DEFAULT 0,
    assigned      TEXT    DEFAULT '',
    last_contacted TEXT   DEFAULT '',
    next_followup  TEXT   DEFAULT '',
    notes         TEXT    DEFAULT '',
    created_at    TEXT    DEFAULT (datetime('now')),
    updated_at    TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    company    TEXT NOT NULL,
    action     TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

// ── Persist db to disk ────────────────────────────────
function saveToDisk() {
  if (!db) return;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ── Init ──────────────────────────────────────────────
async function initDB() {
  SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('✅ Loaded existing database from disk');
  } else {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new SQL.Database();
    db.run(SCHEMA);
    saveToDisk();
    console.log('✅ Created new database');
  }

  return db;
}

// ── Helpers ───────────────────────────────────────────
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const rows = all(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0];
  saveToDisk();
  return lastId ? lastId.values[0][0] : null;
}

// ── Row mapper (snake_case → camelCase) ───────────────
function mapRow(row) {
  if (!row) return null;
  return {
    id:            row.id,
    company:       row.company,
    city:          row.city,
    industry:      row.industry,
    contact:       row.contact,
    email:         row.email,
    phone:         row.phone,
    status:        row.status,
    emailSent:     !!row.email_sent,
    reply:         !!row.reply,
    interested:    !!row.interested,
    dataSent:      !!row.data_sent,
    msgSent:       !!row.msg_sent,
    followup:      !!row.followup,
    assigned:      row.assigned,
    lastContacted: row.last_contacted,
    nextFollowup:  row.next_followup,
    notes:         row.notes,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  };
}

// ── Companies ─────────────────────────────────────────
function getCompanies(filters = {}) {
  let sql = 'SELECT * FROM companies WHERE 1=1';
  const params = [];

  if (filters.search) {
    sql += ` AND (company LIKE ? OR contact LIKE ? OR email LIKE ? OR city LIKE ?)`;
    const s = `%${filters.search}%`;
    params.push(s, s, s, s);
  }
  if (filters.status && filters.status !== 'All') {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.industry && filters.industry !== 'All') {
    sql += ' AND industry = ?';
    params.push(filters.industry);
  }
  if (filters.assigned && filters.assigned !== 'All') {
    sql += ' AND assigned = ?';
    params.push(filters.assigned);
  }

  sql += ' ORDER BY id DESC';
  return all(sql, params).map(mapRow);
}

function getCompanyById(id) {
  return mapRow(get('SELECT * FROM companies WHERE id = ?', [id]));
}

function createCompany(data) {
  const id = run(`
    INSERT INTO companies
      (company, city, industry, contact, email, phone, status,
       email_sent, reply, interested, data_sent, msg_sent, followup,
       assigned, last_contacted, next_followup, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      data.company, data.city || '', data.industry || 'Technology',
      data.contact || '', data.email || '', data.phone || '',
      data.status || 'Not Contacted',
      data.emailSent ? 1 : 0, data.reply ? 1 : 0, data.interested ? 1 : 0,
      data.dataSent ? 1 : 0, data.msgSent ? 1 : 0, data.followup ? 1 : 0,
      data.assigned || '', data.lastContacted || '', data.nextFollowup || '',
      data.notes || ''
    ]
  );
  logActivity(data.company, 'Added to pipeline');
  return getCompanyById(id);
}

function updateCompany(id, data) {
  run(`
    UPDATE companies SET
      company=?, city=?, industry=?, contact=?, email=?, phone=?,
      status=?, email_sent=?, reply=?, interested=?, data_sent=?, msg_sent=?,
      followup=?, assigned=?, last_contacted=?, next_followup=?, notes=?,
      updated_at=datetime('now')
    WHERE id=?`,
    [
      data.company, data.city || '', data.industry || 'Technology',
      data.contact || '', data.email || '', data.phone || '',
      data.status || 'Not Contacted',
      data.emailSent ? 1 : 0, data.reply ? 1 : 0, data.interested ? 1 : 0,
      data.dataSent ? 1 : 0, data.msgSent ? 1 : 0, data.followup ? 1 : 0,
      data.assigned || '', data.lastContacted || '', data.nextFollowup || '',
      data.notes || '', id
    ]
  );
  logActivity(data.company, 'Record updated');
  return getCompanyById(id);
}

function deleteCompany(id) {
  const c = getCompanyById(id);
  if (c) {
    run('DELETE FROM companies WHERE id = ?', [id]);
    logActivity(c.company, 'Record deleted');
  }
  return c;
}

// ── Activity Log ──────────────────────────────────────
function logActivity(company, action) {
  run('INSERT INTO activity_log (company, action) VALUES (?,?)', [company, action]);
}

function getActivityLog(limit = 15) {
  return all(
    'SELECT * FROM activity_log ORDER BY id DESC LIMIT ?', [limit]
  ).map(r => ({
    id:        r.id,
    company:   r.company,
    action:    r.action,
    createdAt: r.created_at,
  }));
}

// ── Stats ─────────────────────────────────────────────
function getStats() {
  const total      = get('SELECT COUNT(*) as n FROM companies').n;
  const contacted  = get("SELECT COUNT(*) as n FROM companies WHERE status != 'Not Contacted'").n;
  const emailSent  = get('SELECT COUNT(*) as n FROM companies WHERE email_sent=1').n;
  const replied    = get('SELECT COUNT(*) as n FROM companies WHERE reply=1').n;
  const interested = get('SELECT COUNT(*) as n FROM companies WHERE interested=1').n;
  const dataSent   = get('SELECT COUNT(*) as n FROM companies WHERE data_sent=1').n;
  const followupSent = get('SELECT COUNT(*) as n FROM companies WHERE followup=1').n;

  const byStatus = {};
  all("SELECT status, COUNT(*) as n FROM companies GROUP BY status").forEach(r => {
    byStatus[r.status] = r.n;
  });

  const byAssigned = {};
  all("SELECT assigned, COUNT(*) as n FROM companies GROUP BY assigned").forEach(r => {
    byAssigned[r.assigned] = r.n;
  });

  const byIndustry = {};
  all("SELECT industry, COUNT(*) as n FROM companies GROUP BY industry").forEach(r => {
    byIndustry[r.industry] = r.n;
  });

  return { total, contacted, emailSent, replied, interested, dataSent, followupSent, byStatus, byAssigned, byIndustry };
}

module.exports = { initDB, getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany, getActivityLog, getStats, logActivity };
