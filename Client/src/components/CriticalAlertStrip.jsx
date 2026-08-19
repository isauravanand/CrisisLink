import React from 'react';

export const CriticalAlertStrip = ({ count = 0, onViewCritical }) => {
  if (!count || count <= 0) return null;

  return (
    <div className="critical-alert-strip">
      <div className="alert-left">
        <span className="alert-dot"></span>
        <span className="alert-text">
          {count} {count === 1 ? 'CRITICAL INCIDENT REQUIRES' : 'CRITICAL INCIDENTS REQUIRE'} IMMEDIATE ATTENTION
        </span>
      </div>

      <button className="view-critical-btn" onClick={onViewCritical}>
        VIEW CRITICAL
      </button>
    </div>
  );
};

export default CriticalAlertStrip;
