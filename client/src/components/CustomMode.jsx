import React, { useState } from 'react';
import EditableTable from './EditableTable';
import { saveSheet, generateExcelFromServer } from '../utils/api';
import { downloadBlob } from '../utils/excelHelper';

const CustomMode = ({ showToast }) => {
  const [tableCount, setTableCount] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [tableConfigs, setTableConfigs] = useState([]);
  const [tablesData, setTablesData] = useState([]);
  const [generated, setGenerated] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTableCountChange = (value) => {
    const count = parseInt(value);
    setTableCount(value);
    if (!count || count < 1) { setTableConfigs([]); return; }
    const maxCount = Math.min(count, 20);
    const configs = Array.from({ length: maxCount }, (_, i) => ({
      name: tableConfigs[i]?.name || `Table ${i + 1}`,
      rows: tableConfigs[i]?.rows || '5',
      cols: tableConfigs[i]?.cols || '4',
    }));
    setTableConfigs(configs);
  };

  const updateConfig = (index, field, value) => {
    const newConfigs = [...tableConfigs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setTableConfigs(newConfigs);
  };

  const handleGenerate = () => {
    if (tableConfigs.length === 0) {
      showToast('Enter number of tables first', 'error');
      return;
    }
    const valid = tableConfigs.every(c => parseInt(c.rows) > 0 && parseInt(c.cols) > 0);
    if (!valid) {
      showToast('All tables must have valid row/column counts', 'error');
      return;
    }
    const data = tableConfigs.map((config) => {
      const r = parseInt(config.rows);
      const c = parseInt(config.cols);
      return {
        name: config.name || 'Sheet',
        rows: r, cols: c,
        headers: Array.from({ length: c }, (_, i) =>
          `Column ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`
        ),
        data: Array.from({ length: r }, () => Array.from({ length: c }, () => '')),
      };
    });
    setTablesData(data);
    setGenerated(true);
    showToast(`${data.length} table(s) generated!`, 'success');
  };

  const updateTableData = (index, newData) => {
    const updated = [...tablesData];
    updated[index] = { ...updated[index], data: newData };
    setTablesData(updated);
  };

  const updateTableHeaders = (index, newHeaders) => {
    const updated = [...tablesData];
    updated[index] = { ...updated[index], headers: newHeaders };
    setTablesData(updated);
  };

  const getTablesWithHeaders = () => {
    return tablesData.map(table => ({
      ...table,
      data: [table.headers, ...table.data],
    }));
  };

  const handleAllAction = async (action) => {
    if (!generated || tablesData.length === 0) return;
    const name = sheetName.trim() || 'CustomSheet';

    if (action === 'save') {
      setSaving(true);
      try {
        await saveSheet({ name, mode: 'custom', tables: getTablesWithHeaders() });
        const blob = await generateExcelFromServer({ name, mode: 'custom', tables: getTablesWithHeaders() });
        downloadBlob(blob, `${name}.xlsx`);
        showToast(`Saved & downloaded "${name}.xlsx" ✓`, 'success');
      } catch (error) {
        showToast('Failed to save. Is the server running?', 'error');
      } finally {
        setSaving(false);
      }
    } else {
      try {
        const blob = await generateExcelFromServer({ name, mode: 'custom', tables: getTablesWithHeaders() });
        downloadBlob(blob, `${name}.xlsx`);
        showToast(`"${name}.xlsx" downloaded!`, 'success');
      } catch (error) {
        showToast('Failed to generate. Is the server running?', 'error');
      }
    }
  };

  const handleAddRow = (index) => {
    const updated = [...tablesData];
    const table = updated[index];
    const numCols = table.data[0].length;
    updated[index] = { ...table, data: [...table.data, Array.from({ length: numCols }, () => '')], rows: table.rows + 1 };
    setTablesData(updated);
    showToast(`Row added to ${table.name}`, 'success');
  };

  const handleAddColumn = (index) => {
    const updated = [...tablesData];
    const table = updated[index];
    const newData = table.data.map(row => [...row, '']);
    const colIdx = table.headers.length;
    const newHeader = `Column ${String.fromCharCode(65 + (colIdx % 26))}${colIdx >= 26 ? Math.floor(colIdx / 26) : ''}`;
    updated[index] = { ...table, data: newData, headers: [...table.headers, newHeader], cols: table.cols + 1 };
    setTablesData(updated);
    showToast(`Column added to ${table.name}`, 'success');
  };

  const handleDeleteRow = (tableIndex, rowIndex) => {
    const updated = [...tablesData];
    const table = updated[tableIndex];
    if (table.data.length <= 1) return;
    const newData = table.data.filter((_, i) => i !== rowIndex);
    updated[tableIndex] = { ...table, data: newData, rows: table.rows - 1 };
    setTablesData(updated);
    showToast(`Row ${rowIndex + 1} deleted from ${table.name}`, 'info');
  };

  const handleDeleteColumn = (tableIndex, colIndex) => {
    const updated = [...tablesData];
    const table = updated[tableIndex];
    if (table.data[0].length <= 1) return;
    const newData = table.data.map(row => row.filter((_, i) => i !== colIndex));
    updated[tableIndex] = { ...table, data: newData, headers: table.headers.filter((_, i) => i !== colIndex), cols: table.cols - 1 };
    setTablesData(updated);
    showToast(`Column ${colIndex + 1} deleted from ${table.name}`, 'info');
  };

  const handleDeleteTable = (tableIndex) => {
    if (tablesData.length <= 1) {
      showToast('You must have at least one table', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${tablesData[tableIndex].name}?`)) return;
    const updated = tablesData.filter((_, i) => i !== tableIndex);
    setTablesData(updated);
    setTableCount(String(updated.length));
    showToast('Table deleted', 'info');
  };

  const handleClear = () => {
    setTableCount('');
    setTableConfigs([]);
    setTablesData([]);
    setGenerated(false);
    setSheetName('');
    showToast('All tables cleared', 'info');
  };

  return (
    <div>
      <div className="card fade-in-up-delay-1" id="custom-mode-card">
        <div className="card-toolbar purple">
          <div className="card-toolbar-icon">🎨</div>
          <div className="card-toolbar-text">
            <h2>Custom Mode</h2>
            <p>Create multiple tables with custom dimensions</p>
          </div>
        </div>
        <div className="card-body">
          <div className="sheet-name-input">
            <div className="form-group">
              <label className="form-label">File Name</label>
              <input id="custom-sheet-name" type="text" className="form-input"
                placeholder="Enter file name..." value={sheetName}
                onChange={(e) => setSheetName(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Number of Tables</label>
            <input id="custom-table-count" type="number" className="form-input"
              placeholder="e.g. 3" value={tableCount}
              onChange={(e) => handleTableCountChange(e.target.value)} min="1" max="20" />
          </div>

          {tableConfigs.length > 0 && (
            <div className="table-configs">
              {tableConfigs.map((config, index) => (
                <div className="table-config-item" key={index}>
                  <div className="form-group">
                    <label className="form-label">Table Name</label>
                    <input type="text" className="form-input" value={config.name}
                      onChange={(e) => updateConfig(index, 'name', e.target.value)}
                      placeholder={`Table ${index + 1}`} id={`custom-table-name-${index}`} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rows</label>
                    <input type="number" className="form-input" value={config.rows}
                      onChange={(e) => updateConfig(index, 'rows', e.target.value)}
                      min="1" max="100" id={`custom-table-rows-${index}`} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Columns</label>
                    <input type="number" className="form-input" value={config.cols}
                      onChange={(e) => updateConfig(index, 'cols', e.target.value)}
                      min="1" max="50" id={`custom-table-cols-${index}`} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="btn-group">
            <button id="custom-generate-btn" className="btn btn-primary"
              onClick={handleGenerate} disabled={tableConfigs.length === 0}>
              ⚡ Generate Tables
            </button>
            {generated && (
              <button id="custom-clear-btn" className="btn btn-outline" onClick={handleClear}>
                ✕ Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {generated && tablesData.length > 0 && (
        <div className="tables-section fade-in-up">
          <div className="tables-section-header">
            <h2>Your Tables <span className="table-count">{tablesData.length}</span></h2>
          </div>
          {tablesData.map((table, index) => (
            <EditableTable
              key={index}
              data={table.data}
              setData={(newData) => updateTableData(index, newData)}
              headers={table.headers}
              setHeaders={(newHeaders) => updateTableHeaders(index, newHeaders)}
              tableName={table.name}
              onDownload={handleAllAction}
              onAddRow={() => handleAddRow(index)}
              onAddColumn={() => handleAddColumn(index)}
              onDeleteRow={(rowIdx) => handleDeleteRow(index, rowIdx)}
              onDeleteColumn={(colIdx) => handleDeleteColumn(index, colIdx)}
              onDeleteTable={() => handleDeleteTable(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomMode;
