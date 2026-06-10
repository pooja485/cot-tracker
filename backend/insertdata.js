const { pool } = require('./db');

async function run() {
  await pool.query(`
    INSERT INTO companies (id, name, industry, website, contact_name, contact_email, status, priority)
    VALUES 
    ('co_1', 'Acme Corp', 'Technology', 'acme.com', 'John Smith', 'john@acme.com', 'Email Sent', 'High'),
    ('co_2', 'Beta Ltd', 'Finance', 'beta.com', 'Jane Doe', 'jane@beta.com', 'Replied', 'Medium'),
    ('co_3', 'Gamma Inc', 'Healthcare', 'gamma.com', 'Bob Lee', 'bob@gamma.com', 'Not Contacted', 'Low'),
    ('co_4', 'Delta Co', 'Technology', 'delta.com', 'Sara Khan', 'sara@delta.com', 'Interested', 'High'),
    ('co_5', 'Omega LLC', 'Retail', 'omega.com', 'Mike Ray', 'mike@omega.com', 'Data Sent', 'Medium')
    ON CONFLICT (id) DO NOTHING
  `);
  console.log('✅ Done! 5 companies added.');
  process.exit(0);
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });