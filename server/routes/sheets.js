const express = require('express');
const router = express.Router();
const Sheet = require('../models/Sheet');
const XLSX = require('xlsx-js-style');

// Helper: Apply bold style to a row
const applyBoldToRow = (ws, rowIdx, numCols, style) => {
  const defaultStyle = {
    font: { bold: true, sz: 12, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'D9E1F2' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      bottom: { style: 'medium', color: { rgb: '000000' } },
    },
  };
  const s = style || defaultStyle;
  for (let c = 0; c < numCols; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c });
    if (ws[cellRef]) {
      ws[cellRef].s = s;
    }
  }
};

// GET all sheets
router.get('/', async (req, res) => {
  try {
    const sheets = await Sheet.find().sort({ createdAt: -1 });
    res.json(sheets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET a single sheet
router.get('/:id', async (req, res) => {
  try {
    const sheet = await Sheet.findById(req.params.id);
    if (!sheet) {
      return res.status(404).json({ message: 'Sheet not found' });
    }
    res.json(sheet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create a new sheet
router.post('/', async (req, res) => {
  try {
    const { name, mode, tables } = req.body;
    const sheet = new Sheet({ name, mode, tables });
    const savedSheet = await sheet.save();
    res.status(201).json(savedSheet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a sheet
router.delete('/:id', async (req, res) => {
  try {
    const sheet = await Sheet.findByIdAndDelete(req.params.id);
    if (!sheet) {
      return res.status(404).json({ message: 'Sheet not found' });
    }
    res.json({ message: 'Sheet deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST download a saved sheet as Excel
router.post('/download/:id', async (req, res) => {
  try {
    const sheet = await Sheet.findById(req.params.id);
    if (!sheet) {
      return res.status(404).json({ message: 'Sheet not found' });
    }

    const workbook = XLSX.utils.book_new();

    if (sheet.mode === 'custom') {
      // Custom mode: all tables in ONE single sheet
      const combinedData = [];
      const merges = [];
      const tableNameRows = [];
      const columnHeaderRows = [];

      sheet.tables.forEach((table, index) => {
        const tableName = table.name || `Table ${index + 1}`;
        const tableData = table.data || [];
        const maxCols = tableData.length > 0 ? tableData[0].length : 1;

        // Table name header row
        const headerRow = [tableName];
        for (let i = 1; i < maxCols; i++) {
          headerRow.push('');
        }
        const headerRowIndex = combinedData.length;
        combinedData.push(headerRow);
        tableNameRows.push({ row: headerRowIndex, cols: maxCols });

        // Merge header cells
        if (maxCols > 1) {
          merges.push({
            s: { r: headerRowIndex, c: 0 },
            e: { r: headerRowIndex, c: maxCols - 1 }
          });
        }

        // First row of data = column headers (titles)
        const colHeaderRowIndex = combinedData.length;
        columnHeaderRows.push({ row: colHeaderRowIndex, cols: maxCols });

        // Table data (first row = titles, rest = data)
        tableData.forEach(row => {
          combinedData.push([...row]);
        });

        // Separator between tables
        if (index < sheet.tables.length - 1) {
          combinedData.push([]);
          combinedData.push([]);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(combinedData);
      ws['!merges'] = merges;

      // Style table name rows — bold, dark background, white text
      tableNameRows.forEach(({ row, cols }) => {
        applyBoldToRow(ws, row, cols, {
          font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1A1A2E' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        });
      });

      // Style column header rows — bold, blue background
      columnHeaderRows.forEach(({ row, cols }) => {
        applyBoldToRow(ws, row, cols);
      });

      // Auto-size columns
      const colWidths = [];
      combinedData.forEach(row => {
        row.forEach((cell, colIdx) => {
          const cellLen = cell ? String(cell).length : 10;
          if (!colWidths[colIdx] || cellLen > colWidths[colIdx]) {
            colWidths[colIdx] = cellLen;
          }
        });
      });
      ws['!cols'] = colWidths.map(w => ({ wch: Math.max(w + 2, 12) }));

      XLSX.utils.book_append_sheet(workbook, ws, 'All Tables');
    } else {
      // Row/Col mode: each table = separate sheet, first row bold
      sheet.tables.forEach((table, index) => {
        const wsData = table.data || [];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const sheetName = table.name || `Sheet${index + 1}`;

        // Bold the first row (headers/titles)
        if (wsData.length > 0) {
          applyBoldToRow(ws, 0, wsData[0].length);
        }

        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      });
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="${sheet.name}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST generate Excel from raw data (without saving to DB) — with bold headers
router.post('/generate', async (req, res) => {
  try {
    const { name, mode, tables } = req.body;
    const fileName = name || 'Sheet';
    const workbook = XLSX.utils.book_new();

    if (mode === 'custom') {
      // Custom mode: all tables in ONE single sheet
      const combinedData = [];
      const merges = [];
      const tableNameRows = [];
      const columnHeaderRows = [];

      tables.forEach((table, index) => {
        const tableName = table.name || `Table ${index + 1}`;
        const tableData = table.data || [];
        const maxCols = tableData.length > 0 ? tableData[0].length : 1;

        // Table name header row
        const headerRow = [tableName];
        for (let i = 1; i < maxCols; i++) {
          headerRow.push('');
        }
        const headerRowIndex = combinedData.length;
        combinedData.push(headerRow);
        tableNameRows.push({ row: headerRowIndex, cols: maxCols });

        if (maxCols > 1) {
          merges.push({
            s: { r: headerRowIndex, c: 0 },
            e: { r: headerRowIndex, c: maxCols - 1 }
          });
        }

        const colHeaderRowIndex = combinedData.length;
        columnHeaderRows.push({ row: colHeaderRowIndex, cols: maxCols });

        tableData.forEach(row => {
          combinedData.push([...row]);
        });

        if (index < tables.length - 1) {
          combinedData.push([]);
          combinedData.push([]);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(combinedData);
      ws['!merges'] = merges;

      tableNameRows.forEach(({ row, cols }) => {
        applyBoldToRow(ws, row, cols, {
          font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1A1A2E' } },
          alignment: { horizontal: 'center', vertical: 'center' },
        });
      });

      columnHeaderRows.forEach(({ row, cols }) => {
        applyBoldToRow(ws, row, cols);
      });

      const colWidths = [];
      combinedData.forEach(row => {
        row.forEach((cell, colIdx) => {
          const cellLen = cell ? String(cell).length : 10;
          if (!colWidths[colIdx] || cellLen > colWidths[colIdx]) {
            colWidths[colIdx] = cellLen;
          }
        });
      });
      ws['!cols'] = colWidths.map(w => ({ wch: Math.max(w + 2, 12) }));

      XLSX.utils.book_append_sheet(workbook, ws, 'All Tables');
    } else {
      // Row/Col mode
      tables.forEach((table, index) => {
        const wsData = table.data || [];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const sheetName = table.name || `Sheet${index + 1}`;

        if (wsData.length > 0) {
          applyBoldToRow(ws, 0, wsData[0].length);
        }

        const colWidths = [];
        wsData.forEach(row => {
          row.forEach((cell, colIdx) => {
            const cellLen = cell ? String(cell).length : 10;
            if (!colWidths[colIdx] || cellLen > colWidths[colIdx]) {
              colWidths[colIdx] = cellLen;
            }
          });
        });
        ws['!cols'] = colWidths.map(w => ({ wch: Math.max(w + 2, 10) }));

        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      });
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
