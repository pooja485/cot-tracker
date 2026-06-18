// backend/routes/upload.js — handles Excel/CSV file uploads
const express = require('express');
const multer  = require('multer');
const XLSX    = require('xlsx');
const path    = require('path');
const fs      = require('fs');
const { createCompany } = require('../db');

const router  = express.Router();
const upload  = multer({ dest: path.join(__dirname, '../../uploads/') });

// Normalize a header string for flexible matching
function norm(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Find value from a row by trying multiple possible header names
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
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  try {
    const workbook  = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data      = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, error: 'File is empty or has no data rows' });
    }

    let imported = 0, skipped = 0, errors = [];

    for (const row of data) {
      // Support many possible column name formats
      const companyName = pick(row,
        'company', 'Company', 'COMPANY',
        'name', 'Name', 'NAME',
        'company name', 'Company Name', 'COMPANY NAME',
        'business', 'Business', 'BUSINESS',
        'organization', 'Organisation'
      );

      if (!companyName) { skipped++; continue; }

      try {
        await createCompany({
          company: companyName,

          city: pick(row,
            'city', 'City', 'CITY',
            'location', 'Location', 'LOCATION',
            'address', 'Address', 'ADDRESS'
          ),

          industry: pick(row,
            'industry', 'Industry', 'INDUSTRY',
            'type', 'Type', 'TYPE',
            'sector', 'Sector', 'category', 'Category'
          ) || 'General',

          contact: pick(row,
            'contact', 'Contact', 'CONTACT',
            'contact person', 'Contact Person',
            'person', 'Person', 'owner', 'Owner',
            'contact name', 'Contact Name'
          ),

          email: pick(row,
            'email', 'Email', 'EMAIL',
            'email address', 'Email Address',
            'e-mail', 'E-mail'
          ),

          phone: pick(row,
            'phone', 'Phone', 'PHONE',
            'contact no', 'Contact No', 'CONTACT.NO',
            'mobile', 'Mobile', 'MOBILE',
            'telephone', 'Telephone', 'tel', 'Tel',
            'phone no', 'Phone No', 'phone number', 'Phone Number',
            'contact number', 'Contact Number'
          ),

          status:        pick(row, 'status', 'Status', 'STATUS') || 'Not Contacted',
          assigned:      pick(row, 'assigned', 'Assigned', 'assigned to', 'Assigned To'),
          lastContacted: pick(row, 'last contacted', 'Last Contacted', 'last contact', 'Last Contact'),
          nextFollowup:  pick(row, 'next follow-up', 'Next Follow-up', 'next followup', 'Next Followup'),
          notes:         pick(row, 'notes', 'Notes', 'NOTES', 'remarks', 'Remarks', 'comments', 'Comments'),

          emailSent:  bool(row, 'email sent', 'Email Sent'),
          reply:      bool(row, 'reply', 'Reply', 'replied', 'Replied'),
          interested: bool(row, 'interested', 'Interested'),
          dataSent:   bool(row, 'data sent', 'Data Sent'),
          msgSent:    bool(row, 'msg sent', 'Msg Sent', 'message sent', 'Message Sent'),
          followup:   bool(row, 'follow-up', 'Follow-up', 'followup', 'Followup'),
        });
        imported++;
      } catch (err) {
        skipped++;
        errors.push(`Row ${imported + skipped}: ${err.message}`);
      }
    }

    fs.unlink(req.file.path, () => {});

    res.json({
      success: true,
      imported,
      skipped,
      total: data.length,
      ...(errors.length > 0 && { errors: errors.slice(0, 5) }) // show first 5 errors max
    });

  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;