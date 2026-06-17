// backend/routes/upload.js — handles Excel/CSV file uploads
const express = require('express');
const multer  = require('multer');
const XLSX    = require('xlsx');
const path    = require('path');
const fs      = require('fs');
const { createCompany } = require('../db');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../../uploads/') });

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  try {
    const workbook  = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data      = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let imported = 0, skipped = 0;

    for (const row of data) {
      const companyName = row.Company || row.company || '';
      if (!companyName.trim()) { skipped++; continue; }
      try {
        await createCompany({
          company:       companyName,
          city:          row.City          || row.city          || '',
          industry:      row.Industry      || row.industry      || 'Technology',
          contact:       row.Contact       || row.contact       || row['Contact Person'] || '',
          email:         row.Email         || row.email         || '',
          phone:         row.Phone         || row.phone         || '',
          status:        row.Status        || row.status        || 'Not Contacted',
          assigned:      row['Assigned To']|| row.assigned      || '',
          lastContacted: row['Last Contacted'] || row.last_contacted || '',
          nextFollowup:  row['Next Follow-up'] || row.next_followup  || '',
          emailSent:     /yes|true|1/i.test(String(row['Email Sent'] || '')),
          reply:         /yes|true|1/i.test(String(row['Reply']       || '')),
          interested:    /yes|true|1/i.test(String(row['Interested']  || '')),
          dataSent:      /yes|true|1/i.test(String(row['Data Sent']   || '')),
          msgSent:       /yes|true|1/i.test(String(row['Msg Sent']    || '')),
          followup:      /yes|true|1/i.test(String(row['Follow-up']   || '')),
          notes:         row.Notes || row.notes || '',
        });
        imported++;
      } catch { skipped++; }
    }

    // clean up temp file
    fs.unlink(req.file.path, () => {});

    res.json({ success: true, imported, skipped, total: data.length });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;