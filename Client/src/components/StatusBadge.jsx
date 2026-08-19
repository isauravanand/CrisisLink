import React from 'react';

export const StatusBadge = ({ status = 'REPORTED' }) => {
  const normalized = (status || 'REPORTED').toUpperCase();

  const statusConfigs = {
    REPORTED: { label: 'PENDING', className: 'status-reported' },
    INVESTIGATING: { label: 'INVESTIGATING', className: 'status-investigating' },
    IN_PROGRESS: { label: 'IN PROGRESS', className: 'status-in-progress' },
    RESOLVED: { label: 'RESOLVED', className: 'status-resolved' },
    DISMISSED: { label: 'DISMISSED', className: 'status-reported' }
  };

  const config = statusConfigs[normalized] || statusConfigs.REPORTED;

  return (
    <span className={`badge-status ${config.className}`}>
      <span className="status-dot-sm"></span>
      {config.label}
    </span>
  );
};

export default StatusBadge;
