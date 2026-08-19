import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, MapPin, Users, Clock, AlertCircle, ExternalLink, Phone } from 'lucide-react';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';
import { formatDateTime, formatType } from '../utils/formatters';
import { getImageUrl } from '../services/api';

const MiniMap = ({ latitude, longitude }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || latitude === undefined || longitude === undefined) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([latitude, longitude], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 32 42">
            <path d="M16 0 C7.16 0 0 7.16 0 16 C0 28 16 42 16 42 C16 42 32 28 32 16 C32 7.16 24.84 0 16 0 Z" fill="#ef4444" stroke="#111" stroke-width="2"/>
            <circle cx="16" cy="16" r="6" fill="#fff" />
          </svg>
        `,
        iconSize: [28, 36],
        iconAnchor: [14, 36]
      });

      L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([latitude, longitude], 14);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude]);

  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <div style={{ marginTop: '0.65rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Click to open exact location in Google Maps"
        style={{ display: 'block', cursor: 'pointer' }}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height: '150px', background: '#111', pointerEvents: 'none' }} />
      </a>

      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          zIndex: 1000,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          borderRadius: '4px',
          color: 'var(--text-primary)',
          padding: '0.35rem 0.65rem',
          fontSize: '0.72rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
        }}
      >
        <ExternalLink size={12} style={{ color: 'var(--sev-high)' }} />
        <span>OPEN IN GOOGLE MAPS</span>
      </a>
    </div>
  );
};

export const EmergencyDetails = ({ emergency, onClose, onUpdateStatus, isUpdating, onActClick }) => {
  if (!emergency) return null;

  const {
    _id,
    caseId,
    description,
    emergencyType,
    victimCount = 1,
    location = {},
    priorityScore = 0,
    priorityLevel = 'MEDIUM',
    status = 'REPORTED',
    contactName,
    contactPhone,
    aiAnalysis = {},
    createdAt
  } = emergency;

  const [updateError, setUpdateError] = useState(null);

  const handleDirectStatusUpdate = async (newStatus) => {
    setUpdateError(null);
    try {
      await onUpdateStatus(_id, newStatus);
    } catch (err) {
      setUpdateError(err.message || 'Failed to update status');
    }
  };

  const aiAssessmentItems = [
    { key: 'immediateDanger', label: 'IMMEDIATE DANGER' },
    { key: 'trapped', label: 'TRAPPED / CONFINED' },
    { key: 'elderly', label: 'ELDERLY PERSON' },
    { key: 'mobilityIssue', label: 'MOBILITY LIMITATION' },
    { key: 'injury', label: 'INJURY REPORTED' },
    { key: 'bleeding', label: 'ACTIVE BLEEDING' },
    { key: 'waterRising', label: 'RISING WATER LEVEL' },
    { key: 'child', label: 'CHILD INVOLVED' }
  ];

  const displayCaseId = caseId || `LF-${_id.slice(-6).toUpperCase()}`;
  const hasCoordinates = location && location.latitude !== undefined && location.longitude !== undefined;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <span className="drawer-id">INCIDENT #{displayCaseId}</span>
            <div className="drawer-title-row">
              <PriorityBadge level={priorityLevel} />
              <span className="type-pill">{formatType(emergencyType)}</span>
              <StatusBadge status={status} />
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {/* INCIDENT SUMMARY */}
          <div className="drawer-block">
            <span className="block-label">INCIDENT SUMMARY</span>
            <p className="block-text">{description}</p>
          </div>

          {/* UPLOADED INJURY EVIDENCE PHOTO */}
          {(emergency.photoUrl || emergency.injuryPhotoUrl) && (
            <div className="drawer-block" style={{ background: 'var(--bg-elevated)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span className="block-label" style={{ color: 'var(--sev-high)' }}>UPLOADED INJURY PHOTO EVIDENCE</span>
              <div style={{ marginTop: '0.5rem', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: '220px' }}>
                <img
                  src={getImageUrl(emergency.photoUrl || emergency.injuryPhotoUrl)}
                  alt="Uploaded Injury Photo Evidence"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
          )}

          {/* AUTOMATED AI MEDICAL REPLY FOR USER */}
          {emergency.aiAutomatedReply && (
            <div className="drawer-block" style={{ background: 'rgba(249, 115, 22, 0.08)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--sev-high-border)' }}>
              <span className="block-label" style={{ color: 'var(--sev-high)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                AUTOMATED AI FIRST-AID REPLY SENT TO USER
              </span>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', marginTop: '0.2rem' }}>
                {emergency.aiAutomatedReply.injuryTitle}
              </strong>
              {emergency.aiAutomatedReply.instructions && emergency.aiAutomatedReply.instructions.length > 0 && (
                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {emergency.aiAutomatedReply.instructions.map((inst, i) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>{inst}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* CONTACT INFO (PROTECTED ADMIN ACTION) */}
          {contactPhone && (
            <div className="drawer-block" style={{ background: 'var(--bg-elevated)', padding: '0.85rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <span className="block-label">REPORTING CONTACT TELEMETRY</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>
                    {contactName || 'Caller Contact'}
                  </strong>
                  <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {contactPhone}
                  </span>
                </div>
                <a
                  href={`tel:${contactPhone}`}
                  className="submit-report-btn"
                  style={{ textDecoration: 'none', padding: '0.4rem 0.85rem', fontSize: '0.8rem', gap: '0.35rem' }}
                >
                  <Phone size={14} />
                  <span>CALL</span>
                </a>
              </div>
            </div>
          )}

          {/* LOCATION */}
          <div className="drawer-block">
            <span className="block-label">LOCATION</span>
            <div className="location-coord-box">
              <span>{hasCoordinates ? location.latitude.toFixed(4) : '0.0000'}° N</span>
              <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>|</span>
              <span>{hasCoordinates ? location.longitude.toFixed(4) : '0.0000'}° E</span>
              {location.address && <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)' }}>({location.address})</span>}
            </div>

            {/* INTERACTIVE GEOSPATIAL MAP PREVIEW & GOOGLE MAPS REDIRECT */}
            {hasCoordinates ? (
              <MiniMap latitude={location.latitude} longitude={location.longitude} />
            ) : (
              <div className="map-placeholder">
                <MapPin size={16} style={{ marginRight: '6px' }} />
                <span>NO GPS COORDINATES DETECTED</span>
              </div>
            )}
          </div>

          {/* VICTIMS & PRIORITY SCORE GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="drawer-block">
              <span className="block-label">VICTIMS</span>
              <div className="priority-score-box">
                <Users size={18} style={{ color: 'var(--text-muted)' }} />
                <span className="score-num">{victimCount}</span>
              </div>
            </div>

            <div className="drawer-block">
              <span className="block-label">PRIORITY SCORE</span>
              <div className="priority-score-box">
                <span className="score-num">{priorityScore}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                  {priorityLevel.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* AUTOMATED INCIDENT ANALYSIS */}
          <div className="drawer-block">
            <span className="block-label">AUTOMATED INCIDENT ANALYSIS (AI ASSESSMENT)</span>
            {aiAnalysis.summary && (
              <p className="block-text" style={{ fontStyle: 'italic', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                "{aiAnalysis.summary}"
              </p>
            )}

            <div className="ai-assessment-grid">
              {aiAssessmentItems.map(({ key, label }) => {
                const isDetected = Boolean(aiAnalysis[key]);
                return (
                  <div key={key} className="ai-grid-row">
                    <span className="ai-grid-label">{label}</span>
                    <span className={`ai-grid-value ${isDetected ? 'val-yes' : 'val-no'}`}>
                      {isDetected ? 'YES' : 'NO'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STATUS CONTROLS */}
          <div className="drawer-block" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <span className="block-label">STATUS CONTROL</span>

            {updateError && (
              <div className="status-error">
                <AlertCircle size={14} />
                <span>{updateError}</span>
              </div>
            )}

            {/* ASSIGNED HOSPITAL TELEMETRY CARD */}
            {emergency.assignedHospital?.name && (
              <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.35)', borderRadius: '8px', padding: '0.85rem 1rem', marginTop: '0.65rem' }}>
                <span className="block-label" style={{ color: 'var(--sev-success)' }}>ASSIGNED HOSPITAL & DISPATCH UNIT</span>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'block', marginTop: '0.15rem' }}>
                  {emergency.assignedHospital.name}
                </strong>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <span>🏥 {emergency.assignedHospital.traumaLevel}</span>
                  <span>📍 {emergency.assignedHospital.distanceKm} km away</span>
                  <span>🚑 Ambulance: {emergency.assignedHospital.ambulanceUnit || 'ALS-UNIT-01'}</span>
                </div>
              </div>
            )}

            <div className="drawer-status-actions" style={{ marginTop: '0.85rem' }}>
              {onActClick && (
                <button
                  className="btn-status-action primary"
                  style={{ background: 'var(--sev-high)', borderColor: 'var(--sev-high)', color: '#ffffff' }}
                  onClick={() => onActClick(emergency)}
                >
                  ⚡ ACT & ASSIGN HOSPITAL (AI)
                </button>
              )}

              {status !== 'IN_PROGRESS' && status !== 'RESOLVED' && status !== 'DISMISSED' && (
                <button
                  className="btn-status-action primary"
                  onClick={() => handleDirectStatusUpdate('IN_PROGRESS')}
                  disabled={isUpdating}
                >
                  MARK IN PROGRESS
                </button>
              )}

              {status !== 'RESOLVED' && status !== 'DISMISSED' && (
                <button
                  className="btn-status-action success"
                  onClick={() => handleDirectStatusUpdate('RESOLVED')}
                  disabled={isUpdating}
                >
                  RESOLVE INCIDENT
                </button>
              )}
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            REPORTED: {formatDateTime(createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyDetails;
