import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { getEmergencyById } from '../services/api';
import { formatDateTime, formatType } from '../utils/formatters';
import { ShieldCheck, Clock, CheckCircle2, Siren, ChevronLeft } from 'lucide-react';

export const MyReport = () => {
  const { id } = useParams();
  const [emergency, setEmergency] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const response = await getEmergencyById(id);
      if (response && response.data) {
        setEmergency(response.data);
        setError(null);
      } else {
        throw new Error('Emergency report not found.');
      }
    } catch (err) {
      console.error('[MyReport Status Error]:', err);
      setError(err.message || 'Unable to retrieve status for this incident.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    pollingRef.current = setInterval(() => {
      fetchStatus();
    }, 15000); // 15s polling

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="public-page-layout">
        <PublicHeader />
        <Loading message="FETCHING INCIDENT TELEMETRY..." />
      </div>
    );
  }

  if (error || !emergency) {
    return (
      <div className="public-page-layout">
        <PublicHeader />
        <main className="form-container">
          <div className="public-form-card" style={{ textAlign: 'center', gap: '1.25rem' }}>
            <Siren size={40} style={{ color: 'var(--sev-critical)', margin: '0 auto' }} />
            <h2 className="form-title">INCIDENT NOT FOUND</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{error}</p>
            <Link to="/report" className="primary-emergency-btn" style={{ textDecoration: 'none', margin: '0 auto' }}>
              REPORT A NEW EMERGENCY
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const {
    _id,
    description,
    emergencyType,
    victimCount,
    priorityLevel,
    status,
    createdAt
  } = emergency;

  // Compute completed steps in the public timeline stepper based on status
  const getStepStatus = (stepName) => {
    const norm = (status || 'REPORTED').toUpperCase();
    if (stepName === 'RECEIVED') return true;
    if (stepName === 'ASSESSMENT') return true; // AI analysis runs synchronously on POST
    if (stepName === 'REVIEW') return norm === 'INVESTIGATING' || norm === 'IN_PROGRESS' || norm === 'RESOLVED';
    if (stepName === 'IN_PROGRESS') return norm === 'IN_PROGRESS' || norm === 'RESOLVED';
    if (stepName === 'RESOLVED') return norm === 'RESOLVED';
    return false;
  };

  const timelineSteps = [
    { key: 'RECEIVED', label: 'REPORT RECEIVED' },
    { key: 'ASSESSMENT', label: 'AI ASSESSMENT' },
    { key: 'REVIEW', label: 'RESPONDER REVIEW' },
    { key: 'IN_PROGRESS', label: 'IN PROGRESS' },
    { key: 'RESOLVED', label: 'RESOLVED' }
  ];

  return (
    <div className="public-page-layout">
      <PublicHeader />

      <main className="form-container">
        <div className="public-form-card">
          <div className="status-hero-box">
            <span className="dot-pulse"></span>
            <span className="status-hero-title">EMERGENCY REPORT PERSISTED</span>
          </div>

          <div className="report-id-bar">
            <div>
              <span className="id-label">INCIDENT REFERENCE ID</span>
              <h2 className="id-value">LFL-{_id.slice(-8).toUpperCase()}</h2>
            </div>
            <div className="report-badges">
              <PriorityBadge level={priorityLevel} />
              <StatusBadge status={status} />
            </div>
          </div>

          {/* GUIDANCE MESSAGE */}
          <div className="guidance-banner">
            <ShieldCheck size={20} className="guidance-icon" />
            <div className="guidance-text">
              <strong>Response teams have received your report.</strong>
              <span> Stay safe and follow local emergency instructions. Status auto-updates every 15s.</span>
            </div>
          </div>

          {/* ASSIGNED HOSPITAL & AMBULANCE DISPATCH CARD */}
          {emergency.assignedHospital?.name && (
            <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '10px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--sev-success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🏥 MEDICAL DISPATCH & ASSIGNED HOSPITAL
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'var(--sev-success)', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  AMBULANCE DISPATCHED
                </span>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {emergency.assignedHospital.name}
              </h3>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span>🏥 {emergency.assignedHospital.traumaLevel}</span>
                <span>📍 {emergency.assignedHospital.distanceKm} km away</span>
                <span>🚑 Unit: {emergency.assignedHospital.ambulanceUnit || 'ALS-UNIT-01'}</span>
              </div>

              {emergency.assignedHospital.contactPhone && (
                <a
                  href={`tel:${emergency.assignedHospital.contactPhone}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', textDecoration: 'none', padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, width: 'fit-content', marginTop: '0.2rem' }}
                >
                  <span>📞 HOSPITAL EMERGENCY CONTACT: {emergency.assignedHospital.contactPhone}</span>
                </a>
              )}
            </div>
          )}

          {/* PUBLIC TIMELINE STEPPER */}
          <div className="timeline-section">
            <span className="input-label">RESPONSE TIMELINE</span>
            <div className="timeline-stepper">
              {timelineSteps.map((step, idx) => {
                const isComplete = getStepStatus(step.key);
                return (
                  <div key={step.key} className={`stepper-item ${isComplete ? 'complete' : ''}`}>
                    <div className="stepper-node">
                      {isComplete ? <CheckCircle2 size={16} /> : <span>{idx + 1}</span>}
                    </div>
                    <span className="stepper-label">{step.label}</span>
                    {idx < timelineSteps.length - 1 && <div className="stepper-line" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* INCIDENT METADATA */}
          <div className="public-summary-block">
            <span className="input-label">REPORT DETAILS</span>
            <p className="summary-desc">{description}</p>
            <div className="meta-row">
              <span>Type: <strong>{formatType(emergencyType)}</strong></span>
              <span>Victims: <strong>{victimCount}</strong></span>
              <span><Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />{formatDateTime(createdAt)}</span>
            </div>
          </div>

          <div className="form-submit-group" style={{ flexDirection: 'row', gap: '1rem' }}>
            <Link to="/report" className="secondary-action-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
              REPORT ANOTHER EMERGENCY
            </Link>
            <Link to="/" className="public-back-link">
              <ChevronLeft size={16} />
              <span>HOME</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyReport;
