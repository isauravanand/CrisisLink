import React from 'react';
import EmergencyCard from './EmergencyCard';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export const EmergencyList = ({
  emergencies = [],
  pagination = {},
  isLoading = false,
  onPageChange,
  onViewDetails,
  onAct
}) => {
  if (isLoading) {
    return (
      <div className="incident-table-container">
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
      </div>
    );
  }

  if (!emergencies || emergencies.length === 0) {
    return (
      <div className="empty-incident-panel">
        <AlertCircle size={36} style={{ color: 'var(--text-muted)' }} />
        <h3 className="empty-title">NO ACTIVE INCIDENTS</h3>
        <p className="empty-desc">
          All monitored emergency incidents are currently resolved or match no filter criteria.
        </p>
      </div>
    );
  }

  const { page = 1, totalPages = 1, total = 0 } = pagination;

  return (
    <div className="table-section">
      <div className="table-meta">
        <span>ACTIVE INCIDENTS ({emergencies.length} of {total})</span>
      </div>

      <div className="incident-table-container">
        {emergencies.map((emergency) => (
          <EmergencyCard
            key={emergency._id}
            emergency={emergency}
            onViewDetails={onViewDetails}
            onAct={onAct}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination-container">
          <button
            className="pg-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={14} />
            <span>PREV</span>
          </button>

          <span className="pg-info">
            PAGE {page} OF {totalPages}
          </span>

          <button
            className="pg-btn"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <span>NEXT</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default EmergencyList;
