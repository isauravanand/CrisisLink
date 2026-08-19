import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { trackEmergency, refreshTrackedEmergency } from '../services/api';
import { formatDateTime, formatType } from '../utils/formatters';
import { Search, RefreshCw, ShieldAlert, Clock, ArrowRight, ShieldCheck, Siren } from 'lucide-react';

export const TrackIncident = () => {
  const [searchParams] = useSearchParams();
  const initialCaseId = searchParams.get('caseId') || '';

  const [caseId, setCaseId] = useState(initialCaseId);

  const [incidentData, setIncidentData] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Auto-verify if query params are provided
  useEffect(() => {
    if (initialCaseId) {
      handleVerify(initialCaseId);
    }
  }, []);

  const handleVerify = async (targetCaseId) => {
    const cId = targetCaseId || caseId;

    if (!cId || cId.trim().length === 0) {
      setError('Please enter a valid Incident Case ID.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await trackEmergency(cId.trim());
      if (response && response.data) {
        setIncidentData(response.data);
        setSessionToken(response.data.sessionToken);
      } else {
        throw new Error('Invalid case ID.');
      }
    } catch (err) {
      console.error('[TrackIncident Error]:', err);
      setError(err.message || 'Invalid case ID.');
      setIncidentData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!sessionToken && !caseId) return;

    setIsRefreshing(true);
    try {
      let response;
      if (sessionToken) {
        response = await refreshTrackedEmergency(sessionToken);
      } else {
        response = await trackEmergency(caseId);
      }

      if (response && response.data) {
        setIncidentData(response.data);
        if (response.data.sessionToken) {
          setSessionToken(response.data.sessionToken);
        }
      }
    } catch (err) {
      console.error('[TrackIncident Refresh Error]:', err);
      // Fallback to re-verifying if session expired
      if (caseId) {
        handleVerify(caseId);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerify(caseId);
  };

  return (
    <div className="public-page-layout">
      <PublicHeader />

      <main className="form-container">
        {/* VIEW 1: INCIDENT STATUS VIEW (SUCCESSFUL VERIFICATION) */}
        {incidentData ? (
          <div className="public-form-card" style={{ gap: '1.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div>
                <span className="input-label" style={{ fontSize: '0.7rem' }}>PUBLIC INCIDENT TRACKER</span>
                <h2 className="form-title" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
                  {incidentData.caseId}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <PriorityBadge level={incidentData.priorityLevel} />
                <StatusBadge status={incidentData.status} />
              </div>
            </div>

            {/* CURRENT STATUS MESSAGE */}
            <div style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '1.25rem',
              position: 'relative'
            }}>
              <div className="status-hero-box" style={{ marginBottom: '0.75rem' }}>
                <span className="dot-pulse"></span>
                <span className="status-hero-title">CURRENT STATUS</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {incidentData.publicMessage}
              </p>
            </div>

            {/* ASSIGNED HOSPITAL & AMBULANCE DISPATCH CARD */}
            {incidentData.assignedHospital?.name && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--sev-success)', textTransform: 'uppercase' }}>
                    🏥 ASSIGNED MEDICAL FACILITY
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'var(--sev-success)', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                    AMBULANCE DISPATCHED
                  </span>
                </div>

                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  {incidentData.assignedHospital.name}
                </strong>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <span>🏥 {incidentData.assignedHospital.traumaLevel}</span>
                  <span>📍 {incidentData.assignedHospital.distanceKm} km away</span>
                  <span>🚑 Ambulance: {incidentData.assignedHospital.ambulanceUnit || 'ALS-UNIT-01'}</span>
                </div>
              </div>
            )}

            {/* INCIDENT DETAILS GRID */}
            <div className="public-summary-block">
              <span className="input-label">INCIDENT SUMMARY</span>
              <p className="summary-desc" style={{ marginBottom: '1rem' }}>{incidentData.description}</p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>EMERGENCY TYPE</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{formatType(incidentData.emergencyType)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>SUBMITTED</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {formatDateTime(incidentData.createdAt)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>LAST UPDATED</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {formatDateTime(incidentData.updatedAt)}
                  </strong>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                onClick={handleRefresh}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} />
                <span>{isRefreshing ? 'REFRESHING...' : 'REFRESH STATUS'}</span>
              </button>

              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => {
                  setIncidentData(null);
                  setSessionToken(null);
                  setError(null);
                }}
                style={{ flex: 1 }}
              >
                TRACK ANOTHER INCIDENT
              </button>
            </div>
          </div>
        ) : (
          /* VIEW 2: LOGIN / VERIFICATION FORM */
          <form onSubmit={handleSubmit} className="public-form-card">
            <div className="form-header" style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
                color: 'var(--sev-high)'
              }}>
                <Search size={24} />
              </div>
              <h2 className="form-title">TRACK YOUR INCIDENT</h2>
              <p className="form-subtitle">Enter your Incident Case ID to check your report status.</p>
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                backgroundColor: 'var(--sev-critical-bg)',
                border: '1px solid var(--sev-critical-border)',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                color: 'var(--sev-critical)',
                fontSize: '0.85rem'
              }}>
                <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* CASE ID INPUT */}
            <div className="form-group">
              <label className="input-label">CASE ID</label>
              <input
                type="text"
                className="public-textarea"
                style={{ height: '44px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                placeholder="e.g. LF-2026-8K29P"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                required
              />
            </div>

            {/* SUBMIT BUTTON */}
            <div className="form-submit-group">
              <button
                type="submit"
                className="submit-report-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span>VERIFYING CASE ID...</span>
                ) : (
                  <>
                    <span>VIEW INCIDENT</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

            <div style={{
              textAlign: 'center',
              marginTop: '1rem',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              Need to submit a new emergency? <Link to="/report" style={{ color: 'var(--sev-high)', textDecoration: 'none' }}>Report Emergency</Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default TrackIncident;
