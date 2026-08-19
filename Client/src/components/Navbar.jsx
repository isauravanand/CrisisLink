import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock } from 'lucide-react';

export const Navbar = ({ onManualRefresh, isRefreshing }) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' • ' +
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="topbar">
      <div>
        <h1 className="page-title">COMMAND CENTER</h1>
        <p className="page-subtitle">Live emergency response monitoring</p>
      </div>

      <div className="topbar-right">
        <div className="clock-indicator">
          <Clock size={13} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
          <span>{timeStr}</span>
        </div>

        <button
          className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
          onClick={onManualRefresh}
          title="Refresh emergency telemetry"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
