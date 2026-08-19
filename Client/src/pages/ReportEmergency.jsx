import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { createEmergency } from '../services/api';
import { saveOfflineReport } from '../utils/offlineSync';
import { MapPin, Navigation, AlertCircle, Send, CheckCircle2, Copy, Check, Search, ShieldCheck, WifiOff } from 'lucide-react';

export const ReportEmergency = () => {
  const navigate = useNavigate();

  // Form State
  const [emergencyType, setEmergencyType] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [victimCount, setVictimCount] = useState(1);
  const [isTrapped, setIsTrapped] = useState(false);
  const [isInjured, setIsInjured] = useState(false);

  // Geolocation State
  const [location, setLocation] = useState({ latitude: 28.6139, longitude: 77.2090, address: '' });
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Submission & Success State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [offlineSuccessRecord, setOfflineSuccessRecord] = useState(null);
  const [copiedCaseId, setCopiedCaseId] = useState(false);
  const [copiedTrackingCode, setCopiedTrackingCode] = useState(false);

  const emergencyTypesList = [
    { id: 'FIRE', label: 'FIRE', icon: '🔥' },
    { id: 'MEDICAL', label: 'MEDICAL', icon: '🚑' },
    { id: 'FLOOD', label: 'FLOOD', icon: '🌊' },
    { id: 'EARTHQUAKE', label: 'EARTHQUAKE', icon: '🏚️' },
    { id: 'ACCIDENT', label: 'ACCIDENT', icon: '🚗' },
    { id: 'TRAIL_SEARCH', label: 'TRAIL SEARCH', icon: '🌲' },
    { id: 'OTHER', label: 'OTHER', icon: '⚠️' }
  ];

  /**
   * Browser Geolocation trigger
   */
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: 'GPS Detected Location'
        });
        setLocationDetected(true);
        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Report will use default city coordinates.');
        } else {
          setLocationError('Unable to retrieve location. You can still submit your report.');
        }
      },
      { timeout: 10000 }
    );
  };

  /**
   * Form Submission Handler
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description || description.trim().length === 0) {
      setFormError('Please describe what is happening.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    // Build context-rich description if user selected trapped/injured
    let fullDescription = description.trim();
    const contextAdditions = [];
    if (isTrapped) contextAdditions.push('Victims are TRAPPED.');
    if (isInjured) contextAdditions.push('Active INJURY reported.');

    if (contextAdditions.length > 0) {
      fullDescription += ` (${contextAdditions.join(' ')})`;
    }

    const payload = {
      description: fullDescription,
      emergencyType,
      victimCount: Math.max(1, parseInt(victimCount, 10) || 1),
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || 'User Report Location'
      }
    };

    try {
      if (!navigator.onLine) {
        const offlineRecord = await saveOfflineReport(payload, 'EMERGENCY');
        setOfflineSuccessRecord(offlineRecord);
        return;
      }

      const response = await createEmergency(payload);
      if (response && response.data) {
        setSubmissionSuccess(response.data);
      } else {
        throw new Error('Invalid response from server.');
      }
    } catch (err) {
      console.warn('[ReportEmergency] Online submit failed, capturing offline:', err);
      try {
        const offlineRecord = await saveOfflineReport(payload, 'EMERGENCY');
        setOfflineSuccessRecord(offlineRecord);
      } catch (saveErr) {
        setFormError(err.message || 'Unable to send emergency report. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'caseId') {
      setCopiedCaseId(true);
      setTimeout(() => setCopiedCaseId(false), 2000);
    } else {
      setCopiedTrackingCode(true);
      setTimeout(() => setCopiedTrackingCode(false), 2000);
    }
  };

  // OFFLINE CONFIRMATION SCREEN COMPONENT
  if (offlineSuccessRecord) {
    return (
      <div className="public-page-layout">
        <PublicHeader />
        <main className="form-container">
          <div className="public-form-card" style={{ textAlign: 'center', gap: '1.5rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.2)'
            }}>
              <WifiOff size={32} />
            </div>

            <div>
              <h2 className="form-title" style={{ color: '#f59e0b' }}>OFFLINE REPORT STORED LOCALLY</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                You are currently offline. Your emergency report has been saved safely on your device.
              </p>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <span className="input-label" style={{ fontSize: '0.7rem' }}>OFFLINE QUEUE REFERENCE ID</span>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                letterSpacing: '1px',
                marginTop: '0.2rem'
              }}>
                {offlineSuccessRecord.offlineId}
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
              padding: '0.85rem 1rem',
              color: '#f59e0b',
              fontSize: '0.825rem',
              textAlign: 'left'
            }}>
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <span>
                <strong>Automatic Admin Dispatch:</strong> As soon as your internet connection is restored, CrisisLink will automatically send this report to the admin response center.
              </span>
            </div>

            <button
              type="button"
              className="secondary-action-btn"
              onClick={() => {
                setOfflineSuccessRecord(null);
                setDescription('');
                setIsTrapped(false);
                setIsInjured(false);
              }}
            >
              SUBMIT ANOTHER REPORT
            </button>
          </div>
        </main>
      </div>
    );
  }

  // SUCCESS SCREEN COMPONENT
  if (submissionSuccess) {
    const { caseId, trackingCode } = submissionSuccess;
    return (
      <div className="public-page-layout">
        <PublicHeader />
        <main className="form-container">
          <div className="public-form-card" style={{ textAlign: 'center', gap: '1.5rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: 'var(--sev-success-bg)',
              color: 'var(--sev-success)',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h2 className="form-title" style={{ color: 'var(--sev-success)' }}>EMERGENCY RECEIVED</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Your report has been submitted successfully to the emergency response queue.
              </p>
            </div>

            {/* CASE ID & TRACKING CODE CARDS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '1.25rem'
            }}>
              {/* CASE ID */}
              <div style={{ textAlign: 'left' }}>
                <span className="input-label" style={{ fontSize: '0.7rem' }}>CASE ID</span>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  letterSpacing: '1px',
                  marginTop: '0.2rem'
                }}>
                  {caseId || 'LF-2026-PENDING'}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(caseId, 'caseId')}
                  style={{
                    marginTop: '0.5rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: copiedCaseId ? 'var(--sev-success)' : 'var(--text-secondary)',
                    borderRadius: '4px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {copiedCaseId ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedCaseId ? 'Copied!' : 'COPY CASE ID'}</span>
                </button>
              </div>

              {/* TRACKING CODE */}
              <div style={{ textAlign: 'left' }}>
                <span className="input-label" style={{ fontSize: '0.7rem' }}>TRACKING CODE</span>
                <div style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--sev-high)',
                  letterSpacing: '1.5px',
                  marginTop: '0.2rem'
                }}>
                  {trackingCode || '7F9K-2M4P'}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(trackingCode, 'trackingCode')}
                  style={{
                    marginTop: '0.5rem',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    color: copiedTrackingCode ? 'var(--sev-success)' : 'var(--text-secondary)',
                    borderRadius: '4px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {copiedTrackingCode ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedTrackingCode ? 'Copied!' : 'COPY TRACKING CODE'}</span>
                </button>
              </div>
            </div>

            {/* AI-ASSISTED ASSESSMENT CARD */}
            <div style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '1.1rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                AI-ASSISTED ASSESSMENT
              </span>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <PriorityBadge level={submissionSuccess.priorityLevel || 'HIGH'} />
                <span style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                  Criticality Score: <strong>{submissionSuccess.priorityScore || 75}/100</strong>
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                <strong style={{ color: '#ffffff' }}>Reason:</strong> {submissionSuccess.aiAnalysis?.summary || 'High priority emergency incident analyzed.'}
              </div>

              <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                <strong style={{ color: '#ffffff' }}>Recommended Action:</strong> Immediate responder review & trauma hospital routing recommended.
              </div>
            </div>

            {/* SAFETY WARNING */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              backgroundColor: 'var(--sev-high-bg)',
              border: '1px solid var(--sev-high-border)',
              borderRadius: '6px',
              padding: '0.85rem 1rem',
              color: 'var(--sev-high)',
              fontSize: '0.825rem',
              textAlign: 'left'
            }}>
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <span>
                <strong>Keep your Case ID safe!</strong> You will need your Case ID to check your incident status later.
              </span>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Link
                to={`/track-incident?caseId=${encodeURIComponent(caseId || '')}`}
                className="submit-report-btn"
                style={{ textDecoration: 'none', justifyContent: 'center' }}
              >
                <Search size={18} />
                <span>TRACK INCIDENT NOW</span>
              </Link>

              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => {
                  setSubmissionSuccess(null);
                  setDescription('');
                  setIsTrapped(false);
                  setIsInjured(false);
                }}
              >
                REPORT ANOTHER EMERGENCY
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="public-page-layout">
      <PublicHeader />

      <main className="form-container">
        <form onSubmit={handleSubmit} className="public-form-card">
          <div className="form-header">
            <h2 className="form-title">REPORT EMERGENCY</h2>
            <p className="form-subtitle">Provide details so response teams can prioritize your incident.</p>
          </div>

          {formError && (
            <div className="critical-alert-strip">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* EMERGENCY TYPE SELECTOR */}
          <div className="form-group">
            <label className="input-label">SELECT EMERGENCY TYPE</label>
            <div className="type-pills-grid">
              {emergencyTypesList.map((typeItem) => (
                <button
                  key={typeItem.id}
                  type="button"
                  className={`type-pill-btn ${emergencyType === typeItem.id ? 'active' : ''}`}
                  onClick={() => setEmergencyType(typeItem.id)}
                >
                  <span>{typeItem.icon}</span>
                  <span>{typeItem.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="form-group">
            <label className="input-label">WHAT IS HAPPENING?</label>
            <textarea
              className="public-textarea"
              rows={4}
              placeholder="Describe what happened, where you are, and whether anyone is in immediate danger."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* VICTIM COUNT */}
          <div className="form-group">
            <label className="input-label">HOW MANY PEOPLE NEED HELP?</label>
            <input
              type="number"
              className="public-number-input"
              min={1}
              value={victimCount}
              onChange={(e) => setVictimCount(e.target.value)}
              required
            />
          </div>

          {/* TRAPPED & INJURED TOGGLES */}
          <div className="segmented-grid">
            <div className="form-group">
              <label className="input-label">IS ANYONE TRAPPED?</label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${isTrapped ? 'active' : ''}`}
                  onClick={() => setIsTrapped(true)}
                >
                  YES
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${!isTrapped ? 'active' : ''}`}
                  onClick={() => setIsTrapped(false)}
                >
                  NO
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">IS ANYONE INJURED?</label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-btn ${isInjured ? 'active' : ''}`}
                  onClick={() => setIsInjured(true)}
                >
                  YES
                </button>
                <button
                  type="button"
                  className={`segmented-btn ${!isInjured ? 'active' : ''}`}
                  onClick={() => setIsInjured(false)}
                >
                  NO
                </button>
              </div>
            </div>
          </div>

          {/* LOCATION SECTION */}
          <div className="form-group">
            <label className="input-label">LOCATION TELEMETRY</label>

            <button
              type="button"
              className="location-detect-btn"
              onClick={handleDetectLocation}
              disabled={locationLoading}
            >
              <Navigation size={16} />
              <span>{locationLoading ? 'Detecting GPS Location...' : '[ USE MY CURRENT LOCATION ]'}</span>
            </button>

            {locationDetected && (
              <div className="location-success-box">
                <CheckCircle2 size={16} style={{ color: 'var(--sev-success)' }} />
                <span>GPS Detected: <strong>{location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E</strong></span>
              </div>
            )}

            {locationError && (
              <div className="location-error-text">
                <MapPin size={14} />
                <span>{locationError}</span>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="form-submit-group">
            <button
              type="submit"
              className="submit-report-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span>SUBMITTING EMERGENCY...</span>
              ) : (
                <>
                  <Send size={18} />
                  <span>SUBMIT EMERGENCY REPORT</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ReportEmergency;
