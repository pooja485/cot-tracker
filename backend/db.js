const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: isProduction
    ? process.env.DATABASE_URL
    : 'postgresql://pooja:mwG0jEK1TgWOALWtgM4lIzEgQSbSrXY0@dpg-d8jvt3jeo5us738pl4p0-a.singapore-postgres.render.com/cottracker',
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        industry TEXT,
        website TEXT,
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        status TEXT DEFAULT 'Not Contacted',
        priority TEXT DEFAULT 'Medium',
        notes TEXT,
        last_contacted DATE,
        follow_up_date DATE,
        deal_value NUMERIC,
        tags TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity (
        id SERIAL PRIMARY KEY,
        company_id TEXT,
        company_name TEXT,
        action TEXT,
        details TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ PostgreSQL database ready');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };