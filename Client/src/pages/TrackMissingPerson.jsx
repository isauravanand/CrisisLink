import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { trackMissingPerson } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { Search, RefreshCw, ShieldAlert, Clock, ArrowRight, UserSearch, MapPin } from 'lucide-react';

export const TrackMissingPerson = () => {
  const [searchParams] = useSearchParams();
  const initialCaseId = searchParams.get('caseId') || '';

  const [caseId, setCaseId] = useState(initialCaseId);
  const [caseData, setCaseData] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialCaseId) {
      handleVerify(initialCaseId);
    }
  }, []);

  const handleVerify = async (targetCaseId) => {
    const cId = targetCaseId || caseId;

    if (!cId || cId.trim().length === 0) {
      setError('Please enter a valid Missing Person Case ID.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await trackMissingPerson(cId.trim());
      if (response && response.data) {
        setCaseData(response.data);
      } else {
        throw new Error('Invalid case ID or tracking credentials.');
      }
    } catch (err) {
      console.error('[TrackMissingPerson Error]:', err);
      setError(err.message || 'Invalid case ID or tracking credentials.');
      setCaseData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!caseId) return;
    setIsRefreshing(true);
    try {
      const response = await trackMissingPerson(caseId);
      if (response && response.data) {
        setCaseData(response.data);
      }
    } catch (err) {
      console.error('[TrackMissingPerson Refresh Error]:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleVerify(caseId);
  };

  const getStatusPillColor = (status) => {
    switch (status) {
      case 'POSSIBLE_MATCH': return { bg: 'rgba(234, 179, 8, 0.15)', text: 'var(--sev-medium)', border: 'var(--sev-medium)' };
      case 'FOUND': return { bg: 'rgba(34, 197, 94, 0.15)', text: 'var(--sev-success)', border: 'var(--sev-success)' };
      case 'CLOSED': return { bg: 'var(--bg-input)', text: 'var(--text-muted)', border: 'var(--border-color)' };
      default: return { bg: 'rgba(239, 68, 68, 0.15)', text: 'var(--sev-high)', border: 'var(--sev-high-border)' };
    }
  };

  return (
    <div className="public-page-layout">
      <PublicHeader />

      <main className="form-container">
        {caseData ? (
          /* VIEW 1: MISSING PERSON STATUS VIEW */
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
                <span className="input-label" style={{ fontSize: '0.7rem' }}>PUBLIC MISSING PERSON TRACKER</span>
                <h2 className="form-title" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
                  {caseData.caseId}
                </h2>
              </div>

              {(() => {
                const style = getStatusPillColor(caseData.status);
                return (
                  <span style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: style.bg,
                    color: style.text,
                    border: `1px solid ${style.border}`
                  }}>
                    ● {caseData.status}
                  </span>
                );
              })()}
            </div>

            {/* CURRENT STATUS MESSAGE */}
            <div style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '1.25rem'
            }}>
              <div className="status-hero-box" style={{ marginBottom: '0.75rem' }}>
                <span className="dot-pulse"></span>
                <span className="status-hero-title">CURRENT STATUS UPDATE</span>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {caseData.publicMessage}
              </p>
            </div>

            {/* CASE DETAILS GRID */}
            <div className="public-summary-block">
              <span className="input-label">MISSING PERSON DETAILS</span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                {caseData.name} ({caseData.age} YRS • {caseData.gender})
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>LAST OBSERVED AREA</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    <MapPin size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {caseData.lastSeenArea}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>LAST UPDATED</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {formatDateTime(caseData.lastUpdated)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>REPORT CREATED</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    {formatDateTime(caseData.createdAt)}
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
                  setCaseData(null);
                  setError(null);
                }}
                style={{ flex: 1 }}
              >
                TRACK ANOTHER REPORT
              </button>
            </div>
          </div>
        ) : (
          /* VIEW 2: SEARCH FORM */
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
                <UserSearch size={24} />
              </div>
              <h2 className="form-title">TRACK MISSING PERSON REPORT</h2>
              <p className="form-subtitle">Enter your Missing Person Case ID to check official search operations status.</p>
            </div>

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

            <div className="form-group">
              <label className="input-label">MISSING PERSON CASE ID</label>
              <input
                type="text"
                className="public-textarea"
                style={{ height: '44px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                placeholder="e.g. MP-2026-0001"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                required
              />
            </div>

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
                    <span>TRACK REPORT</span>
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
              Need to report a new missing person? <Link to="/missing-person" style={{ color: 'var(--sev-high)', textDecoration: 'none' }}>Report Missing Person</Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default TrackMissingPerson;
