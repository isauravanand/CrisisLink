import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { createEmergency } from '../services/api';
import { saveOfflineReport } from '../utils/offlineSync';
import {
  UploadCloud,
  FileText,
  Navigation,
  Send,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Copy,
  Check,
  ShieldCheck,
  MapPin,
  Sparkles,
  Info,
  X,
  Stethoscope,
  ChevronRight,
  WifiOff
} from 'lucide-react';

export const ReportInjury = () => {
  const navigate = useNavigate();

  // Form State
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [victimCount, setVictimCount] = useState(1);
  const [emergencyType, setEmergencyType] = useState('MEDICAL');

  // Geolocation State
  const [location, setLocation] = useState({ latitude: 28.6139, longitude: 77.2090, address: '' });
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // UI & Response State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [offlineSuccessRecord, setOfflineSuccessRecord] = useState(null);
  const [copiedCaseId, setCopiedCaseId] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setFormError('Only image files (JPG, PNG, WEBP) are allowed.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFormError(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

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
          address: 'GPS Verified Location'
        });
        setLocationDetected(true);
        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        setLocationError('Unable to detect GPS. Using default city telemetry.');
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description || description.trim().length === 0) {
      setFormError('Please enter a description of the injury.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      description: description.trim(),
      emergencyType,
      victimCount: Math.max(1, parseInt(victimCount, 10) || 1),
      location,
      photo: selectedFile
    };

    try {
      if (!navigator.onLine) {
        const offlineRecord = await saveOfflineReport(payload, 'INJURY');
        setOfflineSuccessRecord(offlineRecord);
        return;
      }

      const formData = new FormData();
      formData.append('description', description.trim());
      formData.append('emergencyType', emergencyType);
      formData.append('victimCount', Math.max(1, parseInt(victimCount, 10) || 1));
      formData.append('location', JSON.stringify(location));

      if (selectedFile) {
        formData.append('photo', selectedFile);
      }

      const response = await createEmergency(formData);
      if (response && response.data) {
        setSubmissionSuccess(response.data);
      } else {
        throw new Error('Invalid response from AI server.');
      }
    } catch (err) {
      console.warn('[ReportInjury] Submission failed, attempting offline storage:', err);
      try {
        const offlineRecord = await saveOfflineReport(payload, 'INJURY');
        setOfflineSuccessRecord(offlineRecord);
      } catch (saveErr) {
        setFormError(err.message || 'Failed to submit injury report. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCaseId = (caseId) => {
    navigator.clipboard.writeText(caseId);
    setCopiedCaseId(true);
    setTimeout(() => setCopiedCaseId(false), 2000);
  };

  // OFFLINE CONFIRMATION SCREEN
  if (offlineSuccessRecord) {
    return (
      <div className="public-page-layout">
        <PublicHeader />
        <main className="form-container" style={{ maxWidth: '680px' }}>
          <div className="public-form-card" style={{ textAlign: 'center', gap: '1.5rem' }}>
            <div style={{
              width: '56px', height: '56px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
              borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'
            }}>
              <WifiOff size={32} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#f59e0b', margin: 0 }}>OFFLINE INJURY REPORT STORED</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>You are offline. Your report has been saved safely on your device.</p>
            </div>
            <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
              <span className="input-label" style={{ fontSize: '0.7rem' }}>OFFLINE QUEUE REFERENCE ID</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {offlineSuccessRecord.offlineId}
              </div>
            </div>
            <button type="button" className="secondary-action-btn" onClick={() => { setOfflineSuccessRecord(null); setDescription(''); handleRemoveFile(); }}>
              REPORT ANOTHER INJURY
            </button>
          </div>
        </main>
      </div>
    );
  }

  // SUCCESS / AUTOMATED AI REPLY SCREEN
  if (submissionSuccess) {
    const { caseId, trackingCode, aiAutomatedReply, photoUrl, injuryPhotoUrl } = submissionSuccess;
    const aiReply = aiAutomatedReply || {
      triageLevel: 'HIGH',
      injuryTitle: 'Automated Emergency Medical Triage Guidance',
      instructions: [
        'Apply firm direct pressure with a clean cloth to any bleeding site.',
        'Keep the victim lying down, comfortable, and warm with a blanket.',
        'Do not move the injured person unless there is immediate environmental danger.'
      ],
      doNotDo: [
        'Do NOT give oral drinks or food to the victim.',
        'Do NOT attempt to push back protruding bones or align joints.'
      ],
      advice: 'Emergency response dispatch has received your GPS location telemetry.',
      summary: 'Injury report logged successfully.'
    };

    const uploadedPhoto = photoUrl || injuryPhotoUrl || previewUrl;

    return (
      <div className="public-page-layout">
        <PublicHeader />

        <main className="form-container" style={{ maxWidth: '820px' }}>
          <div className="public-form-card" style={{ gap: '1.5rem' }}>
            
            {/* AI AUTOMATED REPLY HEADER BANNER */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(249, 115, 22, 0.15))',
              border: '1px solid var(--sev-high-border)',
              borderRadius: '10px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'var(--sev-high)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)'
                }}>
                  <Bot size={26} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, background: 'var(--sev-high-bg)', color: 'var(--sev-high)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--sev-high-border)' }}>
                      AUTOMATED AI REPLY GENERATED
                    </span>
                    <Sparkles size={14} style={{ color: '#f59e0b' }} />
                  </div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>
                    {aiReply.injuryTitle}
                  </h2>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className={`badge-priority ${(aiReply.triageLevel || 'HIGH').toLowerCase()}`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                  TRIAGE: {aiReply.triageLevel}
                </span>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                  CASE #{caseId}
                </div>
              </div>
            </div>

            {/* UPLOADED PHOTO THUMBNAIL (IF ANY) */}
            {uploadedPhoto && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img
                  src={uploadedPhoto.startsWith('http') || uploadedPhoto.startsWith('blob') ? uploadedPhoto : `http://localhost:5000${uploadedPhoto}`}
                  alt="Uploaded Injury Evidence"
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                />
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--sev-success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CheckCircle2 size={13} /> UPLOADED INJURY EVIDENCE ATTACHED
                  </span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                    Visual evidence analyzed and transmitted to emergency medical response unit.
                  </p>
                </div>
              </div>
            )}

            {/* STEP-BY-STEP FIRST-AID INSTRUCTIONS (AUTOMATED AI REPLY) */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
                <Stethoscope size={18} style={{ color: 'var(--sev-high)' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>IMMEDIATE FIRST-AID ACTION STEPS</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {aiReply.instructions.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--sev-high)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CRITICAL WARNINGS (WHAT NOT TO DO) */}
            {aiReply.doNotDo && aiReply.doNotDo.length > 0 && (
              <div style={{ background: 'var(--sev-critical-bg)', border: '1px solid var(--sev-critical-border)', borderRadius: '10px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--sev-critical)' }}>
                  <AlertTriangle size={18} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>CRITICAL SAFETY WARNINGS (DO NOT DO)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {aiReply.doNotDo.map((warn, idx) => (
                    <div key={idx} style={{ fontSize: '0.8rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: 'var(--sev-critical)', fontWeight: 800 }}>✖</span>
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DISPATCH ADVICE & TRACKING DETAILS */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="input-label" style={{ fontSize: '0.68rem' }}>CASE TRACKING NUMBER</span>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {caseId}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => copyCaseId(caseId)}
                  className="btn-view-action"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.85rem' }}
                >
                  {copiedCaseId ? <Check size={14} style={{ color: 'var(--sev-success)' }} /> : <Copy size={14} />}
                  <span>{copiedCaseId ? 'Copied' : 'Copy Case ID'}</span>
                </button>

                <Link
                  to={`/track-incident?caseId=${encodeURIComponent(caseId || '')}&code=${encodeURIComponent(trackingCode || '')}`}
                  className="submit-report-btn"
                  style={{ textDecoration: 'none', padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
                >
                  <span>TRACK INCIDENT STATUS</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>

            <button
              type="button"
              className="secondary-action-btn"
              onClick={() => {
                setSubmissionSuccess(null);
                setDescription('');
                handleRemoveFile();
              }}
            >
              REPORT ANOTHER INJURY
            </button>

          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="public-page-layout">
      <PublicHeader />

      <main className="form-container" style={{ maxWidth: '680px' }}>
        <form onSubmit={handleSubmit} className="public-form-card">
          <div className="form-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ background: 'var(--sev-high-bg)', border: '1px solid var(--sev-high-border)', padding: '0.5rem', borderRadius: '8px', color: 'var(--sev-high)' }}>
                <Stethoscope size={22} />
              </div>
              <div>
                <h2 className="form-title" style={{ fontSize: '1.25rem', marginBottom: 0 }}>
                  UPLOAD INJURY & AI AUTOMATED REPLY
                </h2>
                <p className="form-subtitle" style={{ fontSize: '0.78rem', marginTop: '0.15rem' }}>
                  Upload an injury photo and description to receive immediate automated AI first-aid triage guidance.
                </p>
              </div>
            </div>
          </div>

          {formError && (
            <div className="critical-alert-strip">
              <AlertTriangle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* INJURY PHOTO UPLOAD DROPZONE */}
          <div className="form-group">
            <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>1. UPLOAD INJURY PHOTO / SCENE EVIDENCE (OPTIONAL)</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>JPG, PNG, WEBP (Max 10MB)</span>
            </label>

            {!previewUrl ? (
              <label className="photo-dropzone">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <UploadCloud size={32} style={{ color: 'var(--sev-high)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Click or drag photo here to upload injury image
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  AI will inspect the image for triage assessment
                </span>
              </label>
            ) : (
              <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', width: '100%', height: '200px' }}>
                <img
                  src={previewUrl}
                  alt="Injury Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Remove uploaded image"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* INJURY DESCRIPTION TEXTAREA */}
          <div className="form-group">
            <label className="input-label">2. ADD INJURY DESCRIPTION</label>
            <textarea
              className="public-textarea"
              rows={4}
              placeholder="Describe the injury (e.g., Deep bleeding laceration on arm, second-degree burn, ankle fracture swelling, difficulty breathing)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* VICTIM COUNT */}
          <div className="form-group">
            <label className="input-label">3. INJURED INDIVIDUALS COUNT</label>
            <input
              type="number"
              className="public-number-input"
              min={1}
              value={victimCount}
              onChange={(e) => setVictimCount(e.target.value)}
              required
            />
          </div>

          {/* LOCATION TELEMETRY */}
          <div className="form-group">
            <label className="input-label">4. GPS LOCATION TELEMETRY</label>

            <button
              type="button"
              className="location-detect-btn"
              onClick={handleDetectLocation}
              disabled={locationLoading}
            >
              <Navigation size={16} />
              <span>{locationLoading ? 'Detecting Location...' : '[ ATTACH MY GPS LOCATION ]'}</span>
            </button>

            {locationDetected && (
              <div className="location-success-box">
                <CheckCircle2 size={16} style={{ color: 'var(--sev-success)' }} />
                <span>GPS Telemetry: <strong>{location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E</strong></span>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="form-submit-group">
            <button
              type="submit"
              className="submit-report-btn"
              disabled={isSubmitting}
              style={{ background: 'var(--sev-high)', borderColor: 'var(--sev-high)' }}
            >
              {isSubmitting ? (
                <span>ANALYZING INJURY & GENERATING AI REPLY...</span>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>SUBMIT INJURY & GENERATE AUTOMATED AI REPLY</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ReportInjury;
