import React from 'react';

export const StatCard = ({ label, count = 0, variant = 'normal', note }) => {
  return (
    <div className={`stat-card stat-card-${variant}`}>
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
      </div>
      <div className="stat-card-count count-{variant}">
        {String(count).padStart(2, '0')}
      </div>
      {note && <span className="stat-card-note">{note}</span>}
    </div>
  );
};

export default StatCard;
