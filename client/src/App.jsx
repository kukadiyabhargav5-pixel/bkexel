import React, { useState, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import RowColMode from './components/RowColMode';
import CustomMode from './components/CustomMode';
import History from './components/History';
import './index.css';

const App = () => {
  const [activePage, setActivePage] = useState('generator');
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 250);
    }, 3000);
  }, []);

  return (
    <div className="app" id="app-root">
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id}
            className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}>
            {toast.type === 'success' && '✅'}
            {toast.type === 'error' && '❌'}
            {toast.type === 'info' && 'ℹ️'}
            {toast.message}
          </div>
        ))}
      </div>

      <main className="main-container">
        {activePage === 'generator' && (
          <div id="generator-page">
            <div className="page-header fade-in-up">
              <h1>Create Your <span>Excel Sheet</span></h1>
              <p>Choose a mode to generate custom spreadsheets with bold headers</p>
            </div>
            <div className="mode-grid">
              <RowColMode showToast={showToast} />
              <CustomMode showToast={showToast} />
            </div>
          </div>
        )}
        {activePage === 'history' && (
          <History showToast={showToast} />
        )}
      </main>

      <div className="footer-info">
        Built with React, Node.js & MongoDB — <a href="#">Excel Generator</a> © 2026
      </div>
    </div>
  );
};

export default App;
