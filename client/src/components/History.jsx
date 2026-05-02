import React, { useState, useEffect } from 'react';
import { getAllSheets, getSheet, deleteSheet, downloadSheetFromServer, saveSheet, generateExcelFromServer } from '../utils/api';
import { downloadBlob } from '../utils/excelHelper';
import EditableTable from './EditableTable';

const History = ({ showToast }) => {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSheet, setActiveSheet] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [editData, setEditData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const data = await getAllSheets();
      setSheets(data);
    } catch (error) {
      showToast('Failed to load history. Is the server running?', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSheets(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteSheet(id);
      setSheets(sheets.filter((s) => s._id !== id));
      if (activeSheet && activeSheet._id === id) {
        setActiveSheet(null);
        setActiveMode(null);
        setEditData(null);
      }
      showToast(`"${name}" deleted`, 'success');
    } catch (error) {
      showToast('Failed to delete sheet', 'error');
    }
  };

  const handleView = async (id) => {
    try {
      const sheet = await getSheet(id);
      setActiveSheet(sheet);
      setActiveMode('view');
      setEditData(null);
      showToast(`Viewing "${sheet.name}"`, 'info');
    } catch (error) {
      showToast('Failed to load sheet', 'error');
    }
  };

  const handleEdit = async (id) => {
    try {
      const sheet = await getSheet(id);
      // Parse tables into editable format with headers
      const tables = sheet.tables.map(t => {
        const data = t.data || [];
        if (data.length > 0) {
          return {
            name: t.name,
            headers: data[0],
            data: data.slice(1),
            rows: data.length - 1,
            cols: data[0].length,
          };
        }
        return { name: t.name, headers: [], data: [], rows: 0, cols: 0 };
      });
      setActiveSheet(sheet);
      setActiveMode('edit');
      setEditData(tables);
      showToast(`Editing "${sheet.name}"`, 'info');
    } catch (error) {
      showToast('Failed to load sheet', 'error');
    }
  };

  const handleClose = () => {
    setActiveSheet(null);
    setActiveMode(null);
    setEditData(null);
  };

  const handleDownload = async (id, name) => {
    try {
      const blob = await downloadSheetFromServer(id);
      downloadBlob(blob, `${name}.xlsx`);
      showToast(`"${name}.xlsx" downloaded!`, 'success');
    } catch (error) {
      showToast('Failed to download sheet', 'error');
    }
  };

  // Edit mode handlers
  const updateTableData = (index, newData) => {
    const updated = [...editData];
    updated[index] = { ...updated[index], data: newData };
    setEditData(updated);
  };

  const updateTableHeaders = (index, newHeaders) => {
    const updated = [...editData];
    updated[index] = { ...updated[index], headers: newHeaders };
    setEditData(updated);
  };

  const handleAddRow = (index) => {
    const updated = [...editData];
    const table = updated[index];
    const numCols = table.data.length > 0 ? table.data[0].length : table.headers.length;
    updated[index] = { ...table, data: [...table.data, Array(numCols).fill('')], rows: table.rows + 1 };
    setEditData(updated);
    showToast('Row added', 'success');
  };

  const handleAddColumn = (index) => {
    const updated = [...editData];
    const table = updated[index];
    const newData = table.data.map(row => [...row, '']);
    const colIdx = table.headers.length;
    const newHeader = `Column ${String.fromCharCode(65 + (colIdx % 26))}`;
    updated[index] = { ...table, data: newData, headers: [...table.headers, newHeader], cols: table.cols + 1 };
    setEditData(updated);
    showToast('Column added', 'success');
  };

  const handleDeleteRow = (tableIndex, rowIndex) => {
    const updated = [...editData];
    const table = updated[tableIndex];
    if (table.data.length <= 1) return;
    updated[tableIndex] = { ...table, data: table.data.filter((_, i) => i !== rowIndex), rows: table.rows - 1 };
    setEditData(updated);
    showToast(`Row ${rowIndex + 1} deleted`, 'info');
  };

  const handleDeleteColumn = (tableIndex, colIndex) => {
    const updated = [...editData];
    const table = updated[tableIndex];
    if (table.headers.length <= 1) return;
    const newData = table.data.map(row => row.filter((_, i) => i !== colIndex));
    updated[tableIndex] = { ...table, data: newData, headers: table.headers.filter((_, i) => i !== colIndex), cols: table.cols - 1 };
    setEditData(updated);
    showToast(`Column ${colIndex + 1} deleted`, 'info');
  };

  const handleDeleteTable = (tableIndex) => {
    if (editData.length <= 1) {
      showToast('Cannot delete the last table in the sheet.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this entire table?')) return;
    const updated = editData.filter((_, i) => i !== tableIndex);
    setEditData(updated);
    showToast('Table deleted', 'info');
  };

  const handleSaveEdits = async (action) => {
    if (!editData || !activeSheet) return;
    const tablesWithHeaders = editData.map(t => ({
      ...t,
      data: [t.headers, ...t.data],
    }));
    const name = activeSheet.name;

    try {
      if (action === 'save') {
        await deleteSheet(activeSheet._id);
        await saveSheet({ name, mode: activeSheet.mode, tables: tablesWithHeaders });
        const blob = await generateExcelFromServer({ name, mode: activeSheet.mode, tables: tablesWithHeaders });
        downloadBlob(blob, `${name}.xlsx`);
        showToast(`"${name}" saved & downloaded!`, 'success');
        handleClose();
        fetchSheets();
      } else {
        const blob = await generateExcelFromServer({ name, mode: activeSheet.mode, tables: tablesWithHeaders });
        downloadBlob(blob, `${name}.xlsx`);
        showToast(`"${name}.xlsx" downloaded!`, 'success');
      }
    } catch (error) {
      showToast('Failed. Is the server running?', 'error');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getTotalRows = (tables) => tables.reduce((sum, t) => sum + (t.data ? t.data.length : 0), 0);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ margin: '0 auto', width: 36, height: 36, borderWidth: 3 }}></div>
        <h3 style={{ marginTop: 18 }}>Loading sheets...</h3>
      </div>
    );
  }

  return (
    <div className="fade-in-up" id="history-page">
      <div className="page-header">
        <h1>Saved <span>Sheets</span></h1>
        <p>View, edit, download, or delete your saved spreadsheets</p>
      </div>

      {/* Active view/edit panel */}
      {activeSheet && (activeMode === 'view' || activeMode === 'edit') && (
        <div className="active-sheet-panel fade-in-up">
          <div className="active-sheet-header">
            <div className="active-sheet-info">
              <h2>{activeMode === 'view' ? '👁 Viewing' : '✏️ Editing'}: {activeSheet.name}</h2>
              <span className={`mode-badge ${activeSheet.mode}`}>
                {activeSheet.mode === 'rowcol' ? 'Row/Col' : 'Custom'}
              </span>
            </div>
            <div className="active-sheet-actions">
              {activeMode === 'edit' && (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdits('save')}>
                    💾 Save & Download
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleSaveEdits('download')}>
                    📥 Download Excel
                  </button>
                </>
              )}
              {activeMode === 'view' && (
                <button className="btn btn-primary btn-sm" onClick={() => handleDownload(activeSheet._id, activeSheet.name)}>
                  📥 Download Excel
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={handleClose}>
                ✕ Close
              </button>
            </div>
          </div>

          <div className="active-sheet-tables">
            {activeMode === 'view' && activeSheet.tables.map((table, index) => {
              const tableData = table.data || [];
              if (tableData.length === 0) return null;
              const viewHeaders = tableData[0];
              const viewRows = tableData.slice(1);
              return (
                <div className="table-wrapper" key={index}>
                  <div className="table-title">
                    <div className="table-title-icon">Ex</div>
                    <h3>{table.name || `Table ${index + 1}`}</h3>
                    <div className="table-title-actions">
                      <span className="table-dim-badge">{viewRows.length} rows × {viewHeaders.length} cols</span>
                    </div>
                  </div>
                  <div className="table-container">
                    <table className="editable-table view-only">
                      <thead>
                        <tr>
                          <th style={{ width: '44px', textAlign: 'center', padding: '11px 8px', fontSize: '11px' }}>#</th>
                          {viewHeaders.map((h, i) => (
                            <th key={i}>
                              <div className="header-cell">
                                <span className="col-number">{i + 1}</span>
                                <span className="header-text">{h}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {viewRows.map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            <td className="row-number">{rowIdx + 1}</td>
                            {row.map((cell, colIdx) => (
                              <td key={colIdx}>
                                <span className="cell-text">{cell || ''}</span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {activeMode === 'edit' && editData && editData.map((table, index) => (
              <EditableTable
                key={index}
                data={table.data}
                setData={(newData) => updateTableData(index, newData)}
                headers={table.headers}
                setHeaders={(newHeaders) => updateTableHeaders(index, newHeaders)}
                tableName={table.name || `Table ${index + 1}`}
                onAddRow={() => handleAddRow(index)}
                onAddColumn={() => handleAddColumn(index)}
                onDeleteRow={(rowIdx) => handleDeleteRow(index, rowIdx)}
                onDeleteColumn={(colIdx) => handleDeleteColumn(index, colIdx)}
                onDeleteTable={() => handleDeleteTable(index)}
                showDownloadBar={false}
              />
            ))}
          </div>
        </div>
      )}

      {sheets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>No saved sheets yet</h3>
          <p>Create and save a sheet from the Generator page</p>
        </div>
      ) : (
        <>
          <div className="search-bar-wrapper">
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                id="history-search"
                type="text"
                className="search-input"
                placeholder="Search sheets by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
            <div className="search-count">
              {sheets.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length} of {sheets.length} sheet{sheets.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="history-grid" key={searchQuery}>
            {sheets.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((sheet, idx) => (
              <div className="history-card card-animate" key={sheet._id} id={`history-card-${sheet._id}`}
                style={{ animationDelay: `${idx * 0.06}s` }}>
                <div className={`history-card-top ${sheet.mode === 'custom' ? 'custom' : ''}`}>
                  <div className="history-card-title">{sheet.name}</div>
                  <div className="history-card-date">{formatDate(sheet.createdAt)}</div>
                  <span className="history-card-badge">
                    {sheet.mode === 'rowcol' ? 'Row/Col' : 'Custom'}
                  </span>
                </div>
                <div className="history-card-body">
                  <div className="history-card-info">
                    <div className="history-card-stat">
                      <span>Tables</span>
                      <span>{sheet.tables.length}</span>
                    </div>
                    <div className="history-card-stat">
                      <span>Total Rows</span>
                      <span>{getTotalRows(sheet.tables)}</span>
                    </div>
                  </div>
                  <div className="history-card-actions-3">
                    <button className="btn btn-view btn-sm" onClick={() => handleView(sheet._id)}>
                      👁 View
                    </button>
                    <button className="btn btn-edit btn-sm" onClick={() => handleEdit(sheet._id)}>
                      ✏️ Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(sheet._id, sheet.name)}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default History;
