import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Eye,
  Radio,
  Search,
  Check,
  RotateCw,
  ShieldAlert,
  Film,
  Activity,
  Phone
} from 'lucide-react';

import { formatDateTime } from '../utils/formatters';
import {
  getDroneVideos,
  startVisualSearch,
  getMatchCandidates,
  updateMatchCandidateStatus,
  getCaseTimeline,
  getMissingPersonSightings,
  getImageUrl
} from '../services/api';


export const MissingPersonDetails = ({ personCase, onClose, onUpdateStatus, isUpdating }) => {
  if (!personCase) return null;

  const {
    _id,
    caseId,
    name,
    age,
    gender,
    photoUrl,
    description,
    lastSeenLocation = {},
    lastSeenAt,
    clothingDescription,
    identifyingFeatures,
    contactName,
    contactPhone,
    status = 'ACTIVE',
    createdAt
  } = personCase;

  const [updateError, setUpdateError] = useState(null);

  // Phase 8 Visual Matching State
  const [completedVideos, setCompletedVideos] = useState([]);
  const [selectedDroneVideoId, setSelectedDroneVideoId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [matchCandidates, setMatchCandidates] = useState([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showFullFrame, setShowFullFrame] = useState(false);

  // Phase 9 Timeline & Location Sightings State
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [sightingsHistory, setSightingsHistory] = useState([]);

  useEffect(() => {
    fetchCompletedDroneVideos();
    fetchMatches();
    fetchTimeline();
    fetchSightings();
  }, [_id, caseId]);

  const fetchTimeline = async () => {
    try {
      const targetId = caseId || _id;
      const res = await getCaseTimeline(targetId);
      if (res && res.data && res.data.events) {
        setTimelineEvents(res.data.events);
      }
    } catch (err) {
      console.error('Failed to fetch case timeline:', err);
    }
  };

  const fetchSightings = async () => {
    try {
      const res = await getMissingPersonSightings(_id);
      if (res && res.data && res.data.history) {
        setSightingsHistory(res.data.history);
      }
    } catch (err) {
      console.error('Failed to fetch sightings history:', err);
    }
  };


  const fetchCompletedDroneVideos = async () => {
    try {
      const res = await getDroneVideos({ page: 1, limit: 50 });
      if (res && res.data && res.data.videos) {
        const finished = res.data.videos.filter(v => v.status === 'COMPLETED');
        setCompletedVideos(finished);
        if (finished.length > 0) {
          setSelectedDroneVideoId(finished[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch drone videos:', err);
    }
  };

  const fetchMatches = async () => {
    setIsLoadingMatches(true);
    try {
      const res = await getMatchCandidates(_id);
      if (res && res.data && res.data.matches) {
        setMatchCandidates(res.data.matches);
      }
    } catch (err) {
      console.error('Failed to fetch match candidates:', err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleStartSearch = async () => {
    if (!selectedDroneVideoId) {
      setSearchError('Please select a completed drone footage run.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await startVisualSearch(_id, selectedDroneVideoId);
      if (res && res.data) {
        fetchMatches();
      }
    } catch (err) {
      setSearchError(err.message || 'Visual search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUpdateCandidateStatus = async (matchId, newStatus) => {
    try {
      const res = await updateMatchCandidateStatus(matchId, newStatus);
      if (res && res.data) {
        fetchMatches();
        if (selectedCandidate && selectedCandidate._id === matchId) {
          setSelectedCandidate(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to update candidate status:', err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdateError(null);
    try {
      await onUpdateStatus(caseId || _id, newStatus);
    } catch (err) {
      setUpdateError(err.message || 'Failed to update status');
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'FOUND':
        return <span className="badge-status status-resolved">FOUND</span>;
      case 'POSSIBLE_MATCH':
        return <span className="badge-status status-in-progress">POSSIBLE MATCH</span>;
      case 'CLOSED':
        return <span className="badge-status status-reported">CLOSED</span>;
      case 'ACTIVE':
      default:
        return <span className="badge-status status-investigating">ACTIVE</span>;
    }
  };

  const formatSeconds = (sec) => {
    if (isNaN(sec) || sec === null) return '00:00';
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  const fullPhotoUrl = getImageUrl(photoUrl);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="drawer-header">
          <div>
            <span className="drawer-id">CASE REFERENCE ID: {caseId}</span>
            <div className="drawer-title-row">
              <h2 className="page-title" style={{ fontSize: '1.2rem' }}>{name}</h2>
              {getStatusBadge(status)}
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* PHOTO & DEMOGRAPHICS CARD */}
          <div style={{ display: 'flex', gap: '1.25rem', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '110px', height: '110px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)' }}>
              <img src={fullPhotoUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{name}</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Age: <strong>{age}</strong></span>
                <span style={{ margin: '0 0.5rem' }}>•</span>
                <span>Gender: <strong>{gender}</strong></span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Reported: {formatDateTime(createdAt)}
              </div>
            </div>
          </div>

          {/* LAST SEEN LOCATION & TELEMETRY */}
          <div className="drawer-block">
            <span className="block-label">LAST SEEN LOCATION & TELEMETRY</span>
            <div className="location-coord-box">
              <span>{lastSeenLocation.latitude !== undefined ? lastSeenLocation.latitude.toFixed(4) : '0.0000'}° N</span>
              <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>|</span>
              <span>{lastSeenLocation.longitude !== undefined ? lastSeenLocation.longitude.toFixed(4) : '0.0000'}° E</span>
              {lastSeenLocation.address && <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)' }}>({lastSeenLocation.address})</span>}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              <Clock size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Last Seen Date: <strong>{formatDateTime(lastSeenAt)}</strong>
            </div>
          </div>

          {/* RESPONSIBLE CONTACT INFO (PROTECTED ADMIN ACTION) */}
          {contactPhone && (
            <div className="drawer-block" style={{ background: 'var(--bg-elevated)', padding: '0.85rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <span className="block-label">RESPONSIBLE CONTACT TELEMETRY</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>
                    {contactName || 'Primary Contact'}
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
                  <span>CALL CONTACT</span>
                </a>
              </div>
            </div>
          )}

          {/* CLOTHING & FEATURES */}
          {clothingDescription && (
            <div className="drawer-block">
              <span className="block-label">CLOTHING DESCRIPTION</span>
              <p className="block-text">{clothingDescription}</p>
            </div>
          )}

          {identifyingFeatures && (
            <div className="drawer-block">
              <span className="block-label">IDENTIFYING FEATURES</span>
              <p className="block-text">{identifyingFeatures}</p>
            </div>
          )}

          {/* ==========================================================================
             PHASE 8: VISUAL SEARCH & CANDIDATE MATCHING MODULE
             ========================================================================== */}
          <div className="drawer-block" style={{ background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={18} style={{ color: 'var(--sev-high)' }} />
                <span className="block-label" style={{ marginBottom: 0, fontSize: '0.9rem' }}>
                  AUTOMATED VISUAL SEARCH ENGINE
                </span>
              </div>
              <span className="type-pill" style={{ fontSize: '0.65rem' }}>PHASE 8</span>
            </div>

            {searchError && (
              <div className="critical-alert-strip" style={{ marginBottom: '0.85rem' }}>
                <AlertCircle size={14} />
                <span>{searchError}</span>
              </div>
            )}

            {/* SEARCH TRIGGER CONTROLS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>SELECT PROCESSED DRONE FOOTAGE FOR MATCHING</label>
              {completedVideos.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '6px' }}>
                  No completed drone search videos available. Please upload search footage under <strong>DRONE INTELLIGENCE</strong> first.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <select
                    className="control-select"
                    style={{ flex: 1, height: '40px', backgroundColor: 'var(--bg-input)' }}
                    value={selectedDroneVideoId}
                    onChange={(e) => setSelectedDroneVideoId(e.target.value)}
                  >
                    {completedVideos.map((vid) => (
                      <option key={vid._id} value={vid._id}>
                        {vid.filename} ({vid.personDetectionsCount || 0} candidate detections)
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="submit-report-btn"
                    style={{ backgroundColor: 'var(--sev-high)', padding: '0 1rem', height: '40px', whiteSpace: 'nowrap', fontSize: '0.8rem' }}
                    disabled={isSearching || !selectedDroneVideoId}
                    onClick={handleStartSearch}
                  >
                    {isSearching ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <RotateCw size={14} className="spin" />
                        RUNNING MATCH...
                      </span>
                    ) : (
                      <span>START VISUAL SEARCH</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* RANKED MATCH CANDIDATES LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="input-label" style={{ marginBottom: 0 }}>
                  POSSIBLE MATCH CANDIDATES ({matchCandidates.length})
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Ranked by visual similarity score
                </span>
              </div>

              {isLoadingMatches ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                  Loading visual match results...
                </div>
              ) : matchCandidates.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.25rem', background: 'var(--bg-input)', borderRadius: '6px' }}>
                  NO MATCH CANDIDATES FOUND. Run a visual search against completed drone footage to extract candidates.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {matchCandidates.map((cand) => {
                    const fullCropUrl = getImageUrl(cand.personCropUrl);
                    const simPct = Math.round(cand.similarityScore * 100);

                    return (
                      <div
                        key={cand._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          background: 'var(--bg-input)',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {/* COMPARISON THUMBNAILS */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <div style={{ width: '46px', height: '46px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                              <img src={fullPhotoUrl} alt="Reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} title="Reference Photo" />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800 }}>VS</span>
                            <div style={{ width: '46px', height: '46px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                              <img src={fullCropUrl} alt="Drone Crop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} title="Drone Detection Crop" />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--sev-high)' }}>
                                POSSIBLE MATCH ({simPct}%)
                              </span>
                              <span className="type-pill" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                                Similarity: {cand.similarityScore}
                              </span>
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <span>Timestamp: <strong>{formatSeconds(cand.timestampSeconds)}</strong></span>
                              <span style={{ margin: '0 0.35rem' }}>•</span>
                              <span>Review Status: <strong style={{ color: cand.status === 'CONFIRMED' ? 'var(--sev-success)' : cand.status === 'REJECTED' ? 'var(--sev-critical)' : 'var(--text-primary)' }}>{cand.status}</strong></span>
                            </div>
                          </div>
                        </div>

                        <button
                          className="btn-view-action"
                          onClick={() => setSelectedCandidate(cand)}
                        >
                          REVIEW CANDIDATE
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CHRONOLOGICAL CASE AUDIT TIMELINE (PHASE 9) */}
          <div className="drawer-block" style={{ background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} style={{ color: 'var(--sev-high)' }} />
                <span className="block-label" style={{ marginBottom: 0, fontSize: '0.9rem' }}>
                  CHRONOLOGICAL CASE AUDIT TIMELINE
                </span>
              </div>
              <span className="type-pill" style={{ fontSize: '0.65rem' }}>PHASE 9</span>
            </div>

            {timelineEvents.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem', background: 'var(--bg-input)', borderRadius: '6px' }}>
                No recorded audit timeline events for this case.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
                {timelineEvents.map((ev, idx) => (
                  <div key={ev._id || idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span style={{
                      position: 'absolute',
                      left: '-1.35rem',
                      top: '4px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: ev.eventType.includes('CONFIRMED') ? 'var(--sev-success)' : ev.eventType.includes('MATCH') ? 'var(--sev-high)' : 'var(--sev-medium)',
                      border: '2px solid var(--bg-elevated)'
                    }}></span>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {ev.eventType.replace(/_/g, ' ')}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {formatDateTime(ev.timestamp)}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {ev.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CASE STATUS CONTROL */}

          <div className="drawer-block" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <span className="block-label">CASE STATUS CONTROL (HUMAN RESPONDER DECISION)</span>

            {updateError && (
              <div className="status-error">
                <AlertCircle size={14} />
                <span>{updateError}</span>
              </div>
            )}

            <div className="drawer-status-actions">
              {status !== 'FOUND' && status !== 'CLOSED' && (
                <button
                  className="btn-status-action success"
                  onClick={() => handleStatusChange('FOUND')}
                  disabled={isUpdating}
                >
                  <UserCheck size={16} />
                  <span>MARK PERSON FOUND</span>
                </button>
              )}

              {status !== 'CLOSED' && (
                <button
                  className="btn-status-action"
                  onClick={() => handleStatusChange('CLOSED')}
                  disabled={isUpdating}
                >
                  <span>CLOSE CASE</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MATCH CANDIDATE REVIEW MODAL */}
      {selectedCandidate && (
        <div className="drawer-backdrop" onClick={() => setSelectedCandidate(null)}>
          <div className="modal-container" style={{ maxWidth: '640px', padding: '1.25rem', gap: '1rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} style={{ color: 'var(--sev-high)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>
                  VISUAL MATCH CANDIDATE COMPARISON
                </h3>
              </div>
              <button className="drawer-close-btn" onClick={() => setSelectedCandidate(null)}>
                <X size={16} />
              </button>
            </div>

            {/* SIDE-BY-SIDE PHOTO COMPARISON */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {/* REFERENCE PHOTO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
                <span className="input-label" style={{ marginBottom: 0 }}>REFERENCE PHOTO ({name})</span>
                <div style={{ width: '100%', height: '220px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000' }}>
                  <img src={fullPhotoUrl} alt="Reference Photo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>

              {/* DETECTED PERSON CROP */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
                <span className="input-label" style={{ marginBottom: 0 }}>DRONE DETECTED CROP</span>
                <div style={{ width: '100%', height: '220px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#000' }}>
                  <img
                    src={getImageUrl(selectedCandidate.personCropUrl)}
                    alt="Detected Person Crop"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>
            </div>

            {/* METRICS */}
            <div style={{ background: 'var(--bg-elevated)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>SIMILARITY SCORE</span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--sev-high)' }}>
                  {selectedCandidate.similarityScore} ({Math.round(selectedCandidate.similarityScore * 100)}%)
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>TIMESTAMP</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {formatSeconds(selectedCandidate.timestampSeconds)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>REVIEW STATUS</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: selectedCandidate.status === 'CONFIRMED' ? 'var(--sev-success)' : selectedCandidate.status === 'REJECTED' ? 'var(--sev-critical)' : 'var(--text-primary)' }}>
                  {selectedCandidate.status}
                </span>
              </div>
            </div>

            {/* ACTIONS ROW */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                className="secondary-action-btn"
                style={{ fontSize: '0.75rem' }}
                onClick={() => setShowFullFrame(true)}
              >
                VIEW FULL FRAME
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn-status-action"
                  style={{ backgroundColor: 'var(--sev-critical-bg)', borderColor: 'var(--sev-critical-border)', color: 'var(--sev-critical)' }}
                  onClick={() => handleUpdateCandidateStatus(selectedCandidate._id, 'REJECTED')}
                >
                  <X size={14} />
                  <span>REJECT MATCH</span>
                </button>

                <button
                  className="btn-status-action success"
                  onClick={() => handleUpdateCandidateStatus(selectedCandidate._id, 'CONFIRMED')}
                >
                  <Check size={14} />
                  <span>CONFIRM MATCH</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL FRAME MODAL VIEW */}
      {showFullFrame && selectedCandidate && (
        <div className="drawer-backdrop" onClick={() => setShowFullFrame(false)}>
          <div className="modal-container" style={{ maxWidth: '820px', padding: '1.25rem', gap: '1rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>FULL DRONE FRAME CONTEXT</h3>
              <button className="drawer-close-btn" onClick={() => setShowFullFrame(false)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ width: '100%', height: '420px', background: '#000', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <img
                src={getImageUrl(selectedCandidate.frameUrl)}
                alt="Full Drone Frame"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissingPersonDetails;
