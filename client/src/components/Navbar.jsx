import React from 'react';

const Navbar = ({ activePage, setActivePage }) => {
  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">Ex</div>
        <div className="navbar-title">
          Excel <span>Generator</span>
        </div>
      </div>
      <div className="navbar-links">
        <button
          id="nav-generator"
          className={`nav-link ${activePage === 'generator' ? 'active' : ''}`}
          onClick={() => setActivePage('generator')}
        >
          ✦ Generator
        </button>
        <button
          id="nav-history"
          className={`nav-link ${activePage === 'history' ? 'active' : ''}`}
          onClick={() => setActivePage('history')}
        >
          ◷ Saved Sheets
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
