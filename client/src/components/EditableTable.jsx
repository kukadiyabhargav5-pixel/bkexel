import React, { useState } from 'react';

const EditableTable = ({ data, setData, headers, setHeaders, tableName, onDownload, onAddRow, onAddColumn, onDeleteRow, onDeleteColumn, onDeleteTable, showDownloadBar = true }) => {
  const [deleteRowNum, setDeleteRowNum] = useState('');
  const [deleteColNum, setDeleteColNum] = useState('');

  const prefix = tableName || 'main';

  const handleCellChange = (rowIdx, colIdx, value) => {
    const newData = data.map((row, rIdx) =>
      rIdx === rowIdx
        ? row.map((cell, cIdx) => (cIdx === colIdx ? value : cell))
        : [...row]
    );
    setData(newData);
  };

  const handleHeaderChange = (colIdx, value) => {
    const newHeaders = [...headers];
    newHeaders[colIdx] = value;
    setHeaders(newHeaders);
  };

  // Navigate to next cell: header → first data row, then right→down
  const focusNext = (rowIdx, colIdx) => {
    const totalCols = data[0].length;
    let nextRow = rowIdx;
    let nextCol = colIdx + 1;
    if (nextCol >= totalCols) {
      nextCol = 0;
      nextRow = rowIdx + 1;
    }
    if (nextRow < data.length) {
      const el = document.getElementById(`cell-${prefix}-${nextRow}-${nextCol}`);
      if (el) el.focus();
    }
  };

  const handleHeaderKeyDown = (e, colIdx) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      const totalCols = data[0].length;
      const nextCol = colIdx + 1;
      if (nextCol < totalCols) {
        // Move to next header
        const el = document.getElementById(`header-${prefix}-${nextCol}`);
        if (el) el.focus();
      } else {
        // Last header → first data cell (row 0, col 0)
        const el = document.getElementById(`cell-${prefix}-0-0`);
        if (el) el.focus();
      }
    }
  };

  const handleCellKeyDown = (e, rowIdx, colIdx) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      focusNext(rowIdx, colIdx);
    }
  };

  const handleDeleteRowByNum = () => {
    const num = parseInt(deleteRowNum);
    if (!num || num < 1 || num > data.length || data.length <= 1) return;
    onDeleteRow(num - 1);
    setDeleteRowNum('');
  };

  const handleDeleteColByNum = () => {
    const num = parseInt(deleteColNum);
    if (!num || num < 1 || num > data[0].length || data[0].length <= 1) return;
    onDeleteColumn(num - 1);
    setDeleteColNum('');
  };

  if (!data || data.length === 0) return null;

  const numCols = data[0].length;
  const highlightRow = deleteRowNum ? parseInt(deleteRowNum) - 1 : -1;
  const highlightCol = deleteColNum ? parseInt(deleteColNum) - 1 : -1;
  const isValidRow = highlightRow >= 0 && highlightRow < data.length;
  const isValidCol = highlightCol >= 0 && highlightCol < numCols;

  return (
    <div className="table-wrapper">
      {tableName && (
        <div className="table-title">
          <div className="table-title-icon">Ex</div>
          <h3>{tableName}</h3>
          <div className="table-title-actions">
            {onAddRow && (
              <button className="btn-table-action" onClick={onAddRow} title="Add Row">+ Row</button>
            )}
            {onAddColumn && (
              <button className="btn-table-action" onClick={onAddColumn} title="Add Column">+ Col</button>
            )}
            {onDeleteTable && (
              <button className="btn-table-action btn-table-danger" onClick={onDeleteTable} title="Delete Entire Table">
                🗑 Delete Table
              </button>
            )}
          </div>
        </div>
      )}
      <div className={`table-container ${!tableName ? 'no-title' : ''}`}>
        <table className="editable-table" id={`table-${prefix}`}>
          <thead>
            <tr>
              <th style={{ width: '44px', textAlign: 'center', padding: '11px 8px', fontSize: '11px' }}>#</th>
              {Array.from({ length: numCols }, (_, i) => (
                <th key={i} className={isValidCol && i === highlightCol ? 'col-highlight' : ''}>
                  <div className="header-cell">
                    <span className="col-number">{i + 1}</span>
                    <input
                      type="text"
                      className="header-input"
                      value={headers && headers[i] !== undefined ? headers[i] : ''}
                      onChange={(e) => handleHeaderChange(i, e.target.value)}
                      onKeyDown={(e) => handleHeaderKeyDown(e, i)}
                      placeholder={`Column ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`}
                      id={`header-${prefix}-${i}`}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className={isValidRow && rowIdx === highlightRow ? 'row-highlight' : ''}>
                <td className={`row-number ${isValidRow && rowIdx === highlightRow ? 'row-num-highlight' : ''}`}>
                  {rowIdx + 1}
                </td>
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className={isValidCol && colIdx === highlightCol ? 'col-cell-highlight' : ''}>
                    <input
                      type="text"
                      className="cell-input"
                      value={cell}
                      onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                      onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                      placeholder={`${String.fromCharCode(65 + (colIdx % 26))}${rowIdx + 1}`}
                      id={`cell-${prefix}-${rowIdx}-${colIdx}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showDownloadBar && (
        <div className="download-bar">
          <div className="download-bar-left">
            <div className="download-bar-info">
              <span className="dot"></span>
              {data.length} rows × {numCols} columns
            </div>
            <div className="download-bar-controls">
              {onAddRow && (
                <button className="btn btn-outline btn-sm" onClick={onAddRow}>＋ Row</button>
              )}
              {onAddColumn && (
                <button className="btn btn-outline btn-sm" onClick={onAddColumn}>＋ Col</button>
              )}
              {onDeleteRow && data.length > 1 && (
                <div className="delete-input-group">
                  <input
                    type="number"
                    className="delete-num-input"
                    placeholder="Row #"
                    value={deleteRowNum}
                    onChange={(e) => setDeleteRowNum(e.target.value)}
                    min="1"
                    max={data.length}
                    onKeyDown={(e) => e.key === 'Enter' && handleDeleteRowByNum()}
                  />
                  <button className="btn btn-danger btn-sm" onClick={handleDeleteRowByNum}
                    disabled={!isValidRow || data.length <= 1}>
                    ✕ Row
                  </button>
                </div>
              )}
              {onDeleteColumn && numCols > 1 && (
                <div className="delete-input-group">
                  <input
                    type="number"
                    className="delete-num-input"
                    placeholder="Col #"
                    value={deleteColNum}
                    onChange={(e) => setDeleteColNum(e.target.value)}
                    min="1"
                    max={numCols}
                    onKeyDown={(e) => e.key === 'Enter' && handleDeleteColByNum()}
                  />
                  <button className="btn btn-danger btn-sm" onClick={handleDeleteColByNum}
                    disabled={!isValidCol || numCols <= 1}>
                    ✕ Col
                  </button>
                </div>
              )}
            </div>
          </div>
          {onDownload && (
            <div className="download-bar-right">
              <button className="btn btn-primary btn-sm" onClick={() => onDownload('save')}>
                💾 Save & Download
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => onDownload('download')}>
                📥 Download Excel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EditableTable;
