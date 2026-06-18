// backend/routes/upload.js
const express = require('express');
const multer  = require('multer');
const XLSX    = require('xlsx');
const { createCompany } = require('../db');

const router = express.Router();
// Use memory storage — no filesystem needed at all
const upload = multer({ storage: multer.memoryStorage() });

function norm(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pick(row, ...keys) {
  const normRow = {};
  for (const k of Object.keys(row)) normRow[norm(k)] = row[k];
  for (const k of keys) {
    const v = normRow[norm(k)];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function bool(row, ...keys) {
  return /yes|true|1/i.test(pick(row, ...keys));
}

router.post('/', upload.single('file'), async (req, res) => {
  console.log('📁 Upload request received');

  if (!req.file) {
    console.log('❌ No file in request');
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  console.log('📄 File received:', req.file.originalname, req.file.size, 'bytes');

  try {
    // Parse directly from buffer — no filesystem needed
    const workbook  = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data      = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`📊 Parsed ${data.length} rows from sheet: ${sheetName}`);
    if (data.length > 0) console.log('🔑 Columns found:', Object.keys(data[0]));

    if (data.length === 0) {
      return res.status(400).json({ success: false, error: 'File is empty or has no data rows' });
    }

    let imported = 0, skipped = 0, errors = [];

    for (const row of data) {
      const companyName = pick(row,
        'company','Company','COMPANY',
        'name','Name','NAME',
        'company name','Company Name','COMPANY NAME',
        'business','Business','organization','Organisation'
      );

      if (!companyName) { skipped++; continue; }

      try {
        await createCompany({
          company:  companyName,
          city:     pick(row,'city','City','CITY','location','Location','address','Address','ADDRESS'),
          industry: pick(row,'industry','Industry','INDUSTRY','type','Type','TYPE','sector','Sector') || 'General',
          contact:  pick(row,'contact','Contact','contact person','Contact Person','person','Person','owner','Owner'),
          email:    pick(row,'email','Email','EMAIL','e-mail'),
          phone:    pick(row,'phone','Phone','PHONE','mobile','Mobile','contact no','Contact No',
                         'CONTACT.NO','contactno','telephone','Telephone','phone number','Phone Number'),
          status:        pick(row,'status','Status','STATUS') || 'Not Contacted',
          assigned:      pick(row,'assigned','Assigned','assigned to','Assigned To'),
          lastContacted: pick(row,'last contacted','Last Contacted','last contact'),
          nextFollowup:  pick(row,'next follow-up','Next Follow-up','next followup'),
          notes:         pick(row,'notes','Notes','NOTES','remarks','Remarks','comments','Comments'),
          emailSent:  bool(row,'email sent','Email Sent'),
          reply:      bool(row,'reply','Reply','replied'),
          interested: bool(row,'interested','Interested'),
          dataSent:   bool(row,'data sent','Data Sent'),
          msgSent:    bool(row,'msg sent','Msg Sent','message sent'),
          followup:   bool(row,'follow-up','Follow-up','followup'),
        });
        imported++;
      } catch (err) {
        skipped++;
        errors.push(err.message);
        console.warn(`⚠️ Row skipped: ${err.message}`);
      }
    }

    console.log(`✅ Import done: ${imported} imported, ${skipped} skipped`);
    res.json({ success: true, imported, skipped, total: data.length,
      ...(errors.length > 0 && { errors: errors.slice(0, 3) }) });

  } catch (err) {
    console.error('❌ Upload processing error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;