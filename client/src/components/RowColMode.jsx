import React, { useState } from 'react';
import EditableTable from './EditableTable';
import { saveSheet, generateExcelFromServer } from '../utils/api';
import { downloadBlob } from '../utils/excelHelper';

const RowColMode = ({ showToast }) => {
  const [rows, setRows] = useState('');
  const [cols, setCols] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [tableData, setTableData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleGenerate = () => {
    const r = parseInt(rows);
    const c = parseInt(cols);
    if (!r || !c || r < 1 || c < 1) {
      showToast('Please enter valid row and column numbers', 'error');
      return;
    }
    if (r > 100 || c > 50) {
      showToast('Maximum 100 rows and 50 columns allowed', 'error');
      return;
    }
    const data = Array.from({ length: r }, () => Array.from({ length: c }, () => ''));
    const defaultHeaders = Array.from({ length: c }, (_, i) =>
      `Column ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`
    );
    setTableData(data);
    setHeaders(defaultHeaders);
    showToast(`Table generated: ${r} × ${c}`, 'success');
  };

  const getDataWithHeaders = () => [headers, ...tableData];

  const handleTableAction = async (action) => {
    if (!tableData) return;
    const name = sheetName.trim() || 'MySheet';

    if (action === 'save') {
      setSaving(true);
      try {
        await saveSheet({
          name,
          mode: 'rowcol',
          tables: [{ name: 'Sheet1', rows: parseInt(rows), cols: parseInt(cols), data: getDataWithHeaders() }],
        });
        const blob = await generateExcelFromServer({
          name, mode: 'rowcol',
          tables: [{ name: 'Sheet1', data: getDataWithHeaders() }],
        });
        downloadBlob(blob, `${name}.xlsx`);
        showToast(`Saved & downloaded "${name}.xlsx" ✓`, 'success');
      } catch (error) {
        showToast('Failed to save. Is the server running?', 'error');
      } finally {
        setSaving(false);
      }
    } else {
      try {
        const blob = await generateExcelFromServer({
          name, mode: 'rowcol',
          tables: [{ name: 'Sheet1', data: getDataWithHeaders() }],
        });
        downloadBlob(blob, `${name}.xlsx`);
        showToast(`"${name}.xlsx" downloaded!`, 'success');
      } catch (error) {
        showToast('Failed to generate. Is the server running?', 'error');
      }
    }
  };

  const handleAddRow = () => {
    if (!tableData) return;
    const numCols = tableData[0].length;
    setTableData([...tableData, Array.from({ length: numCols }, () => '')]);
    setRows(String(tableData.length + 1));
    showToast('Row added', 'success');
  };

  const handleAddColumn = () => {
    if (!tableData) return;
    const newData = tableData.map(row => [...row, '']);
    const colIdx = headers.length;
    const newHeader = `Column ${String.fromCharCode(65 + (colIdx % 26))}${colIdx >= 26 ? Math.floor(colIdx / 26) : ''}`;
    setTableData(newData);
    setHeaders([...headers, newHeader]);
    setCols(String(newData[0].length));
    showToast('Column added', 'success');
  };

  const handleDeleteRow = (index) => {
    if (!tableData || tableData.length <= 1) return;
    const newData = tableData.filter((_, i) => i !== index);
    setTableData(newData);
    setRows(String(newData.length));
    showToast(`Row ${index + 1} deleted`, 'info');
  };

  const handleDeleteColumn = (index) => {
    if (!tableData || tableData[0].length <= 1) return;
    const newData = tableData.map(row => row.filter((_, i) => i !== index));
    setTableData(newData);
    setHeaders(headers.filter((_, i) => i !== index));
    setCols(String(newData[0].length));
    showToast(`Column ${index + 1} deleted`, 'info');
  };

  const handleClear = () => {
    setTableData(null);
    setHeaders([]);
    setRows('');
    setCols('');
    setSheetName('');
    showToast('Table cleared', 'info');
  };

  return (
    <div>
      <div className="card fade-in-up" id="rowcol-mode-card">
        <div className="card-toolbar">
          <div className="card-toolbar-icon">📊</div>
          <div className="card-toolbar-text">
            <h2>Row & Column Count</h2>
            <p>Enter dimensions to generate an editable table</p>
          </div>
        </div>
        <div className="card-body">
          <div className="sheet-name-input">
            <div className="form-group">
              <label className="form-label">Sheet Name</label>
              <input id="rowcol-sheet-name" type="text" className="form-input"
                placeholder="Enter sheet name..." value={sheetName}
                onChange={(e) => setSheetName(e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Rows</label>
              <input id="rowcol-rows-input" type="number" className="form-input"
                placeholder="e.g. 10" value={rows}
                onChange={(e) => setRows(e.target.value)} min="1" max="100" />
            </div>
            <div className="form-group">
              <label className="form-label">Columns</label>
              <input id="rowcol-cols-input" type="number" className="form-input"
                placeholder="e.g. 5" value={cols}
                onChange={(e) => setCols(e.target.value)} min="1" max="50" />
            </div>
          </div>
          <div className="btn-group">
            <button id="rowcol-generate-btn" className="btn btn-primary" onClick={handleGenerate}>
              ⚡ Generate Table
            </button>
            {tableData && (
              <button id="rowcol-clear-btn" className="btn btn-outline" onClick={handleClear}>
                ✕ Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {tableData && (
        <div className="tables-section fade-in-up">
          <EditableTable
            data={tableData}
            setData={setTableData}
            headers={headers}
            setHeaders={setHeaders}
            tableName="Sheet1"
            onDownload={handleTableAction}
            onAddRow={handleAddRow}
            onAddColumn={handleAddColumn}
            onDeleteRow={handleDeleteRow}
            onDeleteColumn={handleDeleteColumn}
          />
        </div>
      )}
    </div>
  );
};

export default RowColMode;
