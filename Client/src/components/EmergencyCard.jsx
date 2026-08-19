import React from 'react';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';
import { formatCoordinates, formatRelativeTime, formatType } from '../utils/formatters';

export const EmergencyCard = ({ emergency, onViewDetails, onAct }) => {
  if (!emergency) return null;

  const {
    _id,
    caseId,
    description,
    emergencyType,
    victimCount = 1,
    location,
    priorityLevel = 'MEDIUM',
    status,
    assignedHospital,
    createdAt
  } = emergency;

  const normalizedSev = (priorityLevel || 'MEDIUM').toLowerCase();
  const displayCaseId = caseId || `LF-${_id.slice(-6).toUpperCase()}`;

  return (
    <div className={`incident-row row-sev-${normalizedSev}`}>
      <div className="col-severity">
        <PriorityBadge level={priorityLevel} />
      </div>

      <div className="col-type">
        <span className="type-pill">{formatType(emergencyType)}</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
          {displayCaseId}
        </span>
      </div>

      <div className="col-description">
        <div className="incident-desc-text" title={description}>
          {description}
        </div>
        <div className="incident-sub-meta" style={{ flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span>{victimCount} {victimCount === 1 ? 'victim' : 'victims'}</span>
          <span>•</span>
          <span>📍 {formatCoordinates(location)}</span>
          {assignedHospital?.name && (
            <>
              <span>•</span>
              <span style={{ color: 'var(--sev-success)', fontWeight: 800, background: 'var(--sev-success-bg)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                🏥 {assignedHospital.name} ({assignedHospital.distanceKm}km)
              </span>
            </>
          )}
        </div>
      </div>

      <div className="col-status">
        <StatusBadge status={status} />
      </div>

      <div className="col-time">
        {formatRelativeTime(createdAt)}
      </div>

      <div className="col-action" style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', width: 'auto', flexShrink: 0 }}>
        <button
          className="btn-act-action"
          style={{
            background: assignedHospital?.name ? 'rgba(34, 197, 94, 0.2)' : 'var(--sev-high)',
            border: assignedHospital?.name ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--sev-high)',
            color: assignedHospital?.name ? '#34d399' : '#ffffff',
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            whiteSpace: 'nowrap'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (onAct) onAct(emergency);
            else onViewDetails(emergency);
          }}
          title={assignedHospital?.name ? `Assigned: ${assignedHospital.name}` : "Act & Assign Hospital with AI"}
        >
          <span>⚡ {assignedHospital?.name ? 'RE-ASSIGN' : 'ACT'}</span>
        </button>

        <button
          className="btn-view-action"
          onClick={() => onViewDetails(emergency)}
        >
          VIEW
        </button>
      </div>
    </div>
  );
};

export default EmergencyCard;

