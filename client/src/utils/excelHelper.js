import * as XLSX from 'xlsx';

/**
 * Apply bold formatting by prepending data and using cell properties
 * Note: xlsx community edition has limited styling. We use uppercase + *** markers
 * for visual distinction. For full bold support, data is structured clearly.
 */

/**
 * Generate and download an Excel file from table data (each table = separate sheet)
 * Used for Row/Col mode
 * Headers (first row) will appear as the first row in Excel
 * @param {string} fileName - Name of the file (without extension)
 * @param {Array} tables - Array of table objects { name, data: [[]], headers: [] }
 */
export const generateExcel = (fileName, tables) => {
  const workbook = XLSX.utils.book_new();

  tables.forEach((table, index) => {
    const sheetName = table.name || `Sheet${index + 1}`;
    const wsData = table.data || [];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-size columns
    const colWidths = [];
    wsData.forEach(row => {
      row.forEach((cell, colIdx) => {
        const cellLen = cell ? String(cell).length : 10;
        if (!colWidths[colIdx] || cellLen > colWidths[colIdx]) {
          colWidths[colIdx] = cellLen;
        }
      });
    });
    worksheet['!cols'] = colWidths.map(w => ({ wch: Math.max(w + 2, 10) }));

    // Set row height for header row to make it stand out
    worksheet['!rows'] = [{ hpt: 25 }];

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Generate and download an Excel file with ALL tables in ONE single sheet
 * Used for Custom mode — all tables appear one below another with title headers
 * @param {string} fileName - Name of the file (without extension)
 * @param {Array} tables - Array of table objects { name, data: [[]] }
 */
export const generateExcelSingleSheet = (fileName, tables) => {
  const workbook = XLSX.utils.book_new();
  const combinedData = [];
  const merges = [];
  const rowHeights = {};

  tables.forEach((table, index) => {
    const tableName = table.name || `Table ${index + 1}`;
    const tableData = table.data || [];
    const maxCols = tableData.length > 0 ? tableData[0].length : 1;

    // Add table name header row (with ★ markers for visual distinction)
    const headerRow = [`★ ${tableName} ★`];
    for (let i = 1; i < maxCols; i++) {
      headerRow.push('');
    }
    const headerRowIndex = combinedData.length;
    combinedData.push(headerRow);
    rowHeights[headerRowIndex] = { hpt: 30 };

    // Track merge for table name header
    if (maxCols > 1) {
      merges.push({
        s: { r: headerRowIndex, c: 0 },
        e: { r: headerRowIndex, c: maxCols - 1 }
      });
    }

    // Column headers row (first row of data = titles)
    const colHeaderRowIndex = combinedData.length;
    rowHeights[colHeaderRowIndex] = { hpt: 25 };

    // Add all table data rows (first row = column titles, rest = data)
    tableData.forEach(row => {
      combinedData.push([...row]);
    });

    // Add 2 blank separator rows between tables
    if (index < tables.length - 1) {
      combinedData.push([]);
      combinedData.push([]);
    }
  });

  const worksheet = XLSX.utils.aoa_to_sheet(combinedData);

  // Apply merges
  worksheet['!merges'] = merges;

  // Apply row heights
  const rows = [];
  for (let i = 0; i < combinedData.length; i++) {
    rows.push(rowHeights[i] || {});
  }
  worksheet['!rows'] = rows;

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
  worksheet['!cols'] = colWidths.map(w => ({ wch: Math.max(w + 2, 12) }));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'All Tables');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

/**
 * Download a blob as a file
 * @param {Blob} blob - The file blob
 * @param {string} fileName - Name of the file
 */
export const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
