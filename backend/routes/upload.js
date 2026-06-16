const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { createCompany } = require('../db');

const router = express.Router();

const upload = multer({
  dest: 'uploads/'
});

router.post(
  '/',
  upload.single('file'),
  async (req, res) => {

    try {

      const workbook =
        XLSX.readFile(req.file.path);

      const sheetName =
        workbook.SheetNames[0];

const data =
  XLSX.utils.sheet_to_json(
    workbook.Sheets[sheetName]
  );

let imported = 0;

for (const row of data) {

  createCompany({
    company: row.Company || row.company || '',
    city: row.City || row.city || '',
    industry: row.Industry || row.industry || 'Technology',
    contact: row.Contact || row.contact || '',
    email: row.Email || row.email || '',
    phone: row.Phone || row.phone || '',
    status: row.Status || row.status || 'Not Contacted',
    assigned: row.Assigned || row.assigned || '',
    notes: row.Notes || row.notes || ''
  });

  imported++;
}

res.json({
  success: true,
  imported,
  totalRecords: data.length
});

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message: error.message
      });

    }

  }
);

module.exports = router;