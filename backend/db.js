// backend/db.js — PostgreSQL database layer
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ── Schema ─────────────────────────────────────────────
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS companies (
    id            SERIAL PRIMARY KEY,
    company       TEXT    NOT NULL,
    city          TEXT    DEFAULT '',
    industry      TEXT    DEFAULT 'Technology',
    contact       TEXT    DEFAULT '',
    email         TEXT    DEFAULT '',
    phone         TEXT    DEFAULT '',
    status        TEXT    DEFAULT 'Not Contacted',
    email_sent    BOOLEAN DEFAULT FALSE,
    reply         BOOLEAN DEFAULT FALSE,
    interested    BOOLEAN DEFAULT FALSE,
    data_sent     BOOLEAN DEFAULT FALSE,
    msg_sent      BOOLEAN DEFAULT FALSE,
    followup      BOOLEAN DEFAULT FALSE,
    assigned      TEXT    DEFAULT '',
    last_contacted TEXT   DEFAULT '',
    next_followup  TEXT   DEFAULT '',
    notes         TEXT    DEFAULT '',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id         SERIAL PRIMARY KEY,
    company    TEXT NOT NULL,
    action     TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

// ── Init ──────────────────────────────────────────────
async function initDB() {
  // Create tables if they don't exist
  await pool.query(SCHEMA);

  // Check what columns actually exist and fix them
  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'companies'
  `);
  const cols = rows.map(r => r.column_name);

  // Rename old column names to new ones if needed
  if (cols.includes('name') && !cols.includes('company')) {
    await pool.query('ALTER TABLE companies RENAME COLUMN name TO company');
    console.log('✅ Renamed column: name → company');
  }
  if (cols.includes('company_name') && !cols.includes('company')) {
    await pool.query('ALTER TABLE companies RENAME COLUMN company_name TO company');
    console.log('✅ Renamed column: company_name → company');
  }

  // Add any missing columns safely
  const migrations = [
    [`reply`,          `BOOLEAN DEFAULT FALSE`],
    [`interested`,     `BOOLEAN DEFAULT FALSE`],
    [`data_sent`,      `BOOLEAN DEFAULT FALSE`],
    [`msg_sent`,       `BOOLEAN DEFAULT FALSE`],
    [`followup`,       `BOOLEAN DEFAULT FALSE`],
    [`email_sent`,     `BOOLEAN DEFAULT FALSE`],
    [`last_contacted`, `TEXT DEFAULT ''`],
    [`next_followup`,  `TEXT DEFAULT ''`],
    [`assigned`,       `TEXT DEFAULT ''`],
    [`notes`,          `TEXT DEFAULT ''`],
    [`city`,           `TEXT DEFAULT ''`],
    [`industry`,       `TEXT DEFAULT 'Technology'`],
    [`contact`,        `TEXT DEFAULT ''`],
    [`email`,          `TEXT DEFAULT ''`],
    [`phone`,          `TEXT DEFAULT ''`],
    [`status`,         `TEXT DEFAULT 'Not Contacted'`],
    [`updated_at`,     `TIMESTAMPTZ DEFAULT NOW()`],
  ];

  for (const [col, def] of migrations) {
  if (!cols.includes(col)) {
    await pool.query(`ALTER TABLE companies ADD COLUMN ${col} ${def}`);
    console.log(`✅ Added column: ${col}`);
  }
}

const debug = await pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'companies'
  ORDER BY ordinal_position
`);

console.log('=== COMPANIES TABLE STRUCTURE ===');
console.table(debug.rows);


const idDebug = await pool.query(`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'companies'
  AND column_name = 'id'
`);

console.log('ID DEBUG:', idDebug.rows);

console.log('✅ PostgreSQL schema ready');
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
async function getCompanies(filters = {}) {
  let sql = 'SELECT * FROM companies WHERE 1=1';
  const params = [];
  let i = 1;

  if (filters.search) {
    sql += ` AND (company ILIKE $${i} OR contact ILIKE $${i} OR email ILIKE $${i} OR city ILIKE $${i})`;
    params.push(`%${filters.search}%`);
    i++;
  }
  if (filters.status && filters.status !== 'All') {
    sql += ` AND status = $${i++}`;
    params.push(filters.status);
  }
  if (filters.industry && filters.industry !== 'All') {
    sql += ` AND industry = $${i++}`;
    params.push(filters.industry);
  }
  if (filters.assigned && filters.assigned !== 'All') {
    sql += ` AND assigned = $${i++}`;
    params.push(filters.assigned);
  }

  sql += ' ORDER BY id DESC';
  const { rows } = await pool.query(sql, params);
  return rows.map(mapRow);
}

async function getCompanyById(id) {
  const { rows } = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
  return mapRow(rows[0] || null);
}

async function createCompany(data) {
  const { rows } = await pool.query(`
    INSERT INTO companies
      (company, city, industry, contact, email, phone, status,
       email_sent, reply, interested, data_sent, msg_sent, followup,
       assigned, last_contacted, next_followup, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING *`,
    [
      data.company, data.city || '', data.industry || 'Technology',
      data.contact || '', data.email || '', data.phone || '',
      data.status || 'Not Contacted',
      !!data.emailSent, !!data.reply, !!data.interested,
      !!data.dataSent, !!data.msgSent, !!data.followup,
      data.assigned || '',
      data.lastContacted || null,  // NULL not '' for date fields
      data.nextFollowup  || null,  // NULL not '' for date fields
      data.notes || ''
    ]
  );
  await logActivity(data.company, 'Added to pipeline');
  return mapRow(rows[0]);
}

async function updateCompany(id, data) {
  const { rows } = await pool.query(`
    UPDATE companies SET
      company=$1, city=$2, industry=$3, contact=$4, email=$5, phone=$6,
      status=$7, email_sent=$8, reply=$9, interested=$10, data_sent=$11,
      msg_sent=$12, followup=$13, assigned=$14, last_contacted=$15,
      next_followup=$16, notes=$17, updated_at=NOW()
    WHERE id=$18
    RETURNING *`,
    [
      data.company, data.city || '', data.industry || 'Technology',
      data.contact || '', data.email || '', data.phone || '',
      data.status || 'Not Contacted',
      !!data.emailSent, !!data.reply, !!data.interested,
      !!data.dataSent, !!data.msgSent, !!data.followup,
      data.assigned || '',
      data.lastContacted || null,
      data.nextFollowup  || null,
      data.notes || '', id
    ]
  );
  await logActivity(data.company, 'Record updated');
  return mapRow(rows[0]);
}

async function deleteCompany(id) {
  const company = await getCompanyById(id);
  if (company) {
    await pool.query('DELETE FROM companies WHERE id = $1', [id]);
    await logActivity(company.company, 'Record deleted');
  }
  return company;
}

// ── Reset (restore demo data) ─────────────────────────
async function resetToDemo() {
  await pool.query('DELETE FROM companies');
  await pool.query('DELETE FROM activity_log');

  const demoData = [
    {company:'Nexora Technologies',city:'San Francisco',industry:'Technology',contact:'Lena Marsh',email:'lena.marsh@nexora.io',phone:'+1 415 234 5678',status:'Interested',emailSent:true,reply:true,interested:true,dataSent:true,msgSent:true,followup:false,assigned:'James Dawson',lastContacted:'2025-05-10',nextFollowup:'2025-05-18',notes:'Highly interested in platform demo. Schedule follow-up call.'},
    {company:'Alpine Finance Group',city:'New York',industry:'Finance',contact:'Derek Stone',email:'d.stone@alpinefinance.com',phone:'+1 212 876 5432',status:'Email Sent',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Sarah Kim',lastContacted:'2025-05-08',nextFollowup:'2025-05-19',notes:'Sent initial outreach email. No reply yet.'},
    {company:'Greenfield Health',city:'Chicago',industry:'Healthcare',contact:'Priya Nair',email:'priya@greenfieldhealth.org',phone:'+1 312 555 0100',status:'Replied',emailSent:true,reply:true,interested:false,dataSent:false,msgSent:true,followup:false,assigned:'Ali Raza',lastContacted:'2025-05-11',nextFollowup:'2025-05-20',notes:'Replied asking for product brochure.'},
    {company:'Orion Retail Co.',city:'Los Angeles',industry:'Retail',contact:'Sam Nguyen',email:'sam.n@orionretail.com',phone:'+1 310 444 9900',status:'Not Contacted',emailSent:false,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Nina Patel',lastContacted:'',nextFollowup:'2025-05-21',notes:''},
    {company:'Vertex Manufacturing',city:'Detroit',industry:'Manufacturing',contact:'Bob Krauss',email:'b.krauss@vertexmfg.com',phone:'+1 313 221 7700',status:'Contacted',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:true,followup:false,assigned:'Tom Brooks',lastContacted:'2025-05-07',nextFollowup:'2025-05-22',notes:'Called Bob directly. Left voicemail.'},
    {company:'Sunrise Real Estate',city:'Miami',industry:'Real Estate',contact:'Julia Velez',email:'julia@sunriserealty.com',phone:'+1 305 999 2200',status:'Data Sent',emailSent:true,reply:true,interested:true,dataSent:true,msgSent:false,followup:false,assigned:'James Dawson',lastContacted:'2025-05-09',nextFollowup:'2025-05-23',notes:'Sent product catalogue. Awaiting decision.'},
    {company:'Axon Logistics Ltd',city:'Dallas',industry:'Logistics',contact:'Marcus Webb',email:'m.webb@axonlogistics.com',phone:'+1 469 333 1111',status:'Message Sent',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:true,followup:false,assigned:'Sarah Kim',lastContacted:'2025-05-06',nextFollowup:'2025-05-24',notes:'LinkedIn message sent.'},
    {company:'Brightpath Education',city:'Boston',industry:'Education',contact:'Amy Chong',email:'amy.chong@brightpath.edu',phone:'+1 617 888 4422',status:'Follow-up Sent',emailSent:true,reply:true,interested:true,dataSent:true,msgSent:true,followup:true,assigned:'Ali Raza',lastContacted:'2025-05-12',nextFollowup:'2025-05-17',notes:'Second follow-up sent. Very interested in training module.'},
    {company:'Meridian Media',city:'Atlanta',industry:'Media',contact:'Chris Parker',email:'c.parker@meridianmedia.tv',phone:'+1 404 777 3300',status:'Interested',emailSent:true,reply:true,interested:true,dataSent:false,msgSent:false,followup:false,assigned:'Nina Patel',lastContacted:'2025-05-10',nextFollowup:'2025-05-19',notes:'Looking for a long-term partnership.'},
    {company:'Cascade Software Inc.',city:'Seattle',industry:'Technology',contact:'Rachel Tan',email:'rachel@cascadesoft.io',phone:'+1 206 654 3210',status:'Email Sent',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Tom Brooks',lastContacted:'2025-05-05',nextFollowup:'2025-05-25',notes:''},
    {company:'Summit Healthcare Partners',city:'Denver',industry:'Healthcare',contact:'Tom Henderson',email:'t.henderson@summithp.com',phone:'+1 720 888 0055',status:'Not Contacted',emailSent:false,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'James Dawson',lastContacted:'',nextFollowup:'2025-05-30',notes:'Referred by Greenfield Health.'},
    {company:'Pacific Finance Corp',city:'San Francisco',industry:'Finance',contact:'Mia Thompson',email:'mia@pacificfinance.com',phone:'+1 415 543 2200',status:'Contacted',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Sarah Kim',lastContacted:'2025-05-03',nextFollowup:'2025-05-21',notes:''},
    {company:'Ironclad Manufacturing',city:'Houston',industry:'Manufacturing',contact:'Dave Martinez',email:'d.martinez@ironclad.com',phone:'+1 713 222 9988',status:'Replied',emailSent:true,reply:true,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Ali Raza',lastContacted:'2025-05-11',nextFollowup:'2025-05-20',notes:'Positive reply. Needs pricing sheet.'},
    {company:'Nova Digital Agency',city:'New York',industry:'Media',contact:'Ellen Park',email:'ellen@novadigital.co',phone:'+1 646 321 4455',status:'Data Sent',emailSent:true,reply:true,interested:true,dataSent:true,msgSent:false,followup:false,assigned:'Tom Brooks',lastContacted:'2025-05-09',nextFollowup:'2025-05-26',notes:''},
    {company:'Urban Logistics Hub',city:'Chicago',industry:'Logistics',contact:'Kevin Shaw',email:'k.shaw@urbanlogistics.com',phone:'+1 312 645 8800',status:'Contacted',emailSent:true,reply:false,interested:false,dataSent:false,msgSent:false,followup:false,assigned:'Nina Patel',lastContacted:'2025-05-08',nextFollowup:'2025-05-27',notes:''},
  ];

  for (const d of demoData) await createCompany(d);
  return demoData.length;
}

// ── Activity Log ──────────────────────────────────────
async function logActivity(company, action) {
  await pool.query('INSERT INTO activity_log (company, action) VALUES ($1, $2)', [company, action]);
}

async function getActivityLog(limit = 15) {
  const { rows } = await pool.query(
    'SELECT * FROM activity_log ORDER BY id DESC LIMIT $1', [limit]
  );
  return rows.map(r => ({
    id:        r.id,
    company:   r.company,
    action:    r.action,
    createdAt: r.created_at,
  }));
}

// ── Stats ─────────────────────────────────────────────
async function getStats() {
  const q = (sql) => pool.query(sql).then(r => r.rows[0]);

  const [total, contacted, emailSent, replied, interested, dataSent, followupSent,
         byStatusRows, byAssignedRows, byIndustryRows] = await Promise.all([
    q("SELECT COUNT(*) as n FROM companies"),
    q("SELECT COUNT(*) as n FROM companies WHERE status != 'Not Contacted'"),
    q("SELECT COUNT(*) as n FROM companies WHERE email_sent=TRUE"),
    q("SELECT COUNT(*) as n FROM companies WHERE reply=TRUE"),
    q("SELECT COUNT(*) as n FROM companies WHERE interested=TRUE"),
    q("SELECT COUNT(*) as n FROM companies WHERE data_sent=TRUE"),
    q("SELECT COUNT(*) as n FROM companies WHERE followup=TRUE"),
    pool.query("SELECT status, COUNT(*) as n FROM companies GROUP BY status").then(r => r.rows),
    pool.query("SELECT assigned, COUNT(*) as n FROM companies GROUP BY assigned").then(r => r.rows),
    pool.query("SELECT industry, COUNT(*) as n FROM companies GROUP BY industry").then(r => r.rows),
  ]);

  const byStatus   = Object.fromEntries(byStatusRows.map(r => [r.status, Number(r.n)]));
  const byAssigned = Object.fromEntries(byAssignedRows.map(r => [r.assigned, Number(r.n)]));
  const byIndustry = Object.fromEntries(byIndustryRows.map(r => [r.industry, Number(r.n)]));

  return {
    total:        Number(total.n),
    contacted:    Number(contacted.n),
    emailSent:    Number(emailSent.n),
    replied:      Number(replied.n),
    interested:   Number(interested.n),
    dataSent:     Number(dataSent.n),
    followupSent: Number(followupSent.n),
    byStatus, byAssigned, byIndustry,
  };
}

module.exports = { initDB, getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany, getActivityLog, getStats, logActivity, resetToDemo };