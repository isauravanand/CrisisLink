import React from 'react';

export const PriorityBadge = ({ level = 'MEDIUM' }) => {
  const normalized = (level || 'MEDIUM').toLowerCase();

  return (
    <span className={`badge-priority ${normalized}`}>
      {level.toUpperCase()}
    </span>
  );
};

export default PriorityBadge;
