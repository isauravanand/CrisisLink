import React, { useState, useEffect } from 'react';
import { actAndAssignHospital, getHospitals } from '../services/api';
import {
  X,
  Zap,
  Building2,
  Phone,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Bot,
  MapPin,
  Ambulance,
  ExternalLink
} from 'lucide-react';
import PriorityBadge from './PriorityBadge';

export const ActHospitalModal = ({ emergency, onClose, onHospitalAssigned }) => {
  const [hospitals, setHospitals] = useState([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(true);
  const [isProcessingAct, setIsProcessingAct] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [error, setError] = useState(null);

  const lat = emergency?.location?.latitude || 28.6139;
  const lng = emergency?.location?.longitude || 77.2090;

  useEffect(() => {
    fetchNearbyHospitals();
  }, [lat, lng]);

  const fetchNearbyHospitals = async () => {
    setIsLoadingHospitals(true);
    try {
      const res = await getHospitals(lat, lng);
      if (res && res.data && res.data.hospitals) {
        setHospitals(res.data.hospitals);
      }
    } catch (err) {
      console.error('Error fetching hospitals directory:', err);
    } finally {
      setIsLoadingHospitals(false);
    }
  };

  const handleActAssign = async (manualHospitalId = null) => {
    setIsProcessingAct(true);
    setError(null);
    try {
      const res = await actAndAssignHospital(emergency._id, manualHospitalId);
      if (res && res.data) {
        setAssignmentResult(res.data.assignedHospital);
        if (onHospitalAssigned) {
          onHospitalAssigned(res.data.emergency);
        }
      }
    } catch (err) {
      console.error('ACT Hospital Assignment error:', err);
      setError(err.message || 'Failed to complete AI hospital assignment.');
    } finally {
      setIsProcessingAct(false);
    }
  };

  if (!emergency) return null;

  const currentAssigned = assignmentResult || emergency.assignedHospital;

  return (
    <div className="drawer-backdrop" onClick={onClose} style={{ zIndex: 100000 }}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', padding: 0, overflow: 'hidden' }}
      >
        {/* MODAL HEADER */}
        <div style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)', padding: '1.15rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'var(--sev-high)', color: '#fff', width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  ACT & AI HOSPITAL ASSIGNMENT
                </h3>
                <span className="type-pill" style={{ background: 'rgba(249, 115, 22, 0.15)', color: 'var(--sev-high)', borderColor: 'var(--sev-high-border)', fontSize: '0.65rem' }}>
                  AUTOMATED TRIAGE
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Incident #{emergency.caseId || emergency._id} • GPS Verified Location
              </span>
            </div>
          </div>

          <button className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '78vh', overflowY: 'auto' }}>
          
          {error && (
            <div className="critical-alert-strip">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* INCIDENT CRITICALITY CARD */}
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <span className="block-label">INCIDENT SUMMARY</span>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600, margin: '0.2rem 0 0 0' }}>
                {emergency.description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <MapPin size={12} style={{ color: 'var(--sev-high)' }} />
                <span>{emergency.location?.address || 'GPS Coordinates Registered'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
              <PriorityBadge level={emergency.priorityLevel} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                SCORE: {emergency.priorityScore || 0}/100
              </span>
            </div>
          </div>

          {/* AI ROUTING AGENT OPERATIONAL WORKFLOW */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.85rem 1rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              AI ROUTING AGENT OPERATIONAL WORKFLOW
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.72rem', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={13} style={{ color: '#22c55e' }} /> Analyze emergency</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={13} style={{ color: '#22c55e' }} /> Determine priority</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={13} style={{ color: '#22c55e' }} /> Identify care</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={13} style={{ color: '#22c55e' }} /> Search hospitals</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={13} style={{ color: '#22c55e' }} /> Check availability</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={13} style={{ color: '#22c55e' }} /> Rank options</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><CheckCircle2 size={13} style={{ color: '#38bdf8' }} /> Recommendation ready</div>
            </div>
          </div>

          {/* AI AUTOMATED MATCHING PRIMARY BUTTON */}
          {!currentAssigned?.name ? (
            <button
              onClick={() => handleActAssign(null)}
              disabled={isProcessingAct}
              style={{
                background: 'linear-gradient(135deg, #f97316, #dc2626)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '1.1rem',
                fontSize: '1rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(249, 115, 22, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              {isProcessingAct ? (
                <span>AI EVALUATING CRITICALITY & ASSIGNING HOSPITAL...</span>
              ) : (
                <>
                  <Bot size={22} />
                  <span>⚡ RUN AI AUTOMATED MATCH & ASSIGN HOSPITAL</span>
                  <Sparkles size={18} />
                </>
              )}
            </button>
          ) : (
            /* ASSIGNED HOSPITAL BANNER */
            <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '10px', padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--sev-success)' }}>
                  <CheckCircle2 size={20} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>HOSPITAL ASSIGNED BY AI</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--sev-success)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                  AMBULANCE DISPATCHED
                </span>
              </div>

              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {currentAssigned.name}
                </h4>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <span>🏥 {currentAssigned.traumaLevel}</span>
                  <span>📍 {currentAssigned.distanceKm} km away</span>
                  <span>🚑 Unit: {currentAssigned.ambulanceUnit || 'ALS-UNIT-01'}</span>
                </div>
              </div>

              {currentAssigned.aiReasoning && (
                <div style={{ background: 'var(--bg-elevated)', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', fontStyle: 'italic' }}>
                  "{currentAssigned.aiReasoning}"
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.35rem' }}>
                <a
                  href={`tel:${currentAssigned.contactPhone}`}
                  style={{ textDecoration: 'none', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Phone size={13} style={{ color: 'var(--sev-success)' }} />
                  <span>CALL HOSPITAL DIRECT: {currentAssigned.contactPhone}</span>
                </a>

                <button
                  type="button"
                  onClick={() => setAssignmentResult(null)}
                  style={{ background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  CHANGE ASSIGNMENT
                </button>
              </div>
            </div>
          )}

          {/* NEARBY REGIONAL HOSPITALS DIRECTORY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Building2 size={16} style={{ color: 'var(--sev-high)' }} />
                NEARBY TRAUMA & EMERGENCY HOSPITALS ({hospitals.length})
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Sorted by Proximity
              </span>
            </div>

            {isLoadingHospitals ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                Loading nearby hospitals directory...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {hospitals.map((hosp) => {
                  const isCurrentAssigned = currentAssigned?.hospitalId === hosp.id || currentAssigned?.name === hosp.name;
                  return (
                    <div
                      key={hosp.id}
                      style={{
                        background: isCurrentAssigned ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-elevated)',
                        border: isCurrentAssigned ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {hosp.name}
                          </span>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, background: 'var(--bg-input)', color: '#34d399', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            {hosp.distanceKm} km
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          🏥 {hosp.traumaLevel} • ICU Beds: <strong style={{ color: 'var(--text-primary)' }}>{hosp.icuBedsAvailable}</strong>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          📍 {hosp.address}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <a
                          href={hosp.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="drawer-close-btn"
                          title="View on Google Maps"
                          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '0.45rem', borderRadius: '6px', display: 'flex' }}
                        >
                          <Navigation size={14} style={{ color: '#10b981' }} />
                        </a>

                        <button
                          type="button"
                          disabled={isProcessingAct}
                          onClick={() => handleActAssign(hosp.id)}
                          style={{
                            background: isCurrentAssigned ? 'var(--sev-success)' : 'var(--bg-input)',
                            border: isCurrentAssigned ? '1px solid var(--sev-success)' : '1px solid var(--border-color)',
                            color: isCurrentAssigned ? '#ffffff' : 'var(--text-primary)',
                            padding: '0.45rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          {isCurrentAssigned ? 'ASSIGNED ✓' : 'ASSIGN THIS'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ActHospitalModal;
