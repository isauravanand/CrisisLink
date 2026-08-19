import React, { useState, useEffect, useRef } from 'react';
import {
  uploadDroneVideo,
  getDroneVideos,
  getDroneVideoById,
  getDroneVideoDetections,
  getMissingPersons,
  getImageUrl
} from '../services/api';
import {
  Radio,
  UploadCloud,
  Film,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserSearch,
  Eye,
  Play,
  RotateCw,
  X,
  ChevronRight,
  ShieldAlert,
  Camera
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';
import LiveDroneSearch from './LiveDroneSearch';

export const DroneIntelligence = () => {
  // Mode Toggle: 'LIVE_CAMERA' vs 'UPLOAD_VIDEO'
  const [searchMode, setSearchMode] = useState('LIVE_CAMERA');

  // Missing Person Options
  const [missingCases, setMissingCases] = useState([]);
  const [selectedMissingId, setSelectedMissingId] = useState('');

  // Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Active Video Processing State
  const [activeVideo, setActiveVideo] = useState(null);
  const [detections, setDetections] = useState([]);
  const [isLoadingDetections, setIsLoadingDetections] = useState(false);

  // Video History List
  const [videoHistory, setVideoHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Modal / Detail Review
  const [selectedDetection, setSelectedDetection] = useState(null);
  const videoPlayerRef = useRef(null);

  /**
   * Fetch Active Missing Persons for Dropdown & Recent Drone Videos
   */
  useEffect(() => {
    fetchMissingCases();
    fetchDroneHistory();
  }, []);

  const fetchMissingCases = async () => {
    try {
      const res = await getMissingPersons({ limit: 50 });
      if (res && res.data && res.data.cases) {
        setMissingCases(res.data.cases);
      }
    } catch (err) {
      console.error('Failed to load missing person cases:', err);
    }
  };

  const fetchDroneHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getDroneVideos({ page: 1, limit: 10 });
      if (res && res.data && res.data.videos) {
        setVideoHistory(res.data.videos);
        // If no active video selected, pick the most recent one
        if (!activeVideo && res.data.videos.length > 0) {
          selectVideo(res.data.videos[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load drone video history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  /**
   * Polling for Video Processing Status (Runs every 2s while status is PROCESSING or UPLOADED)
   */
  useEffect(() => {
    if (!activeVideo || (activeVideo.status !== 'PROCESSING' && activeVideo.status !== 'UPLOADED')) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const res = await getDroneVideoById(activeVideo._id);
        if (res && res.data) {
          setActiveVideo(res.data);
          // If state transitioned to COMPLETED or FAILED, update history & load detections
          if (res.data.status === 'COMPLETED') {
            clearInterval(intervalId);
            fetchDetections(res.data._id);
            fetchDroneHistory();
          } else if (res.data.status === 'FAILED') {
            clearInterval(intervalId);
            fetchDroneHistory();
          }
        }
      } catch (err) {
        console.error('Polling error for drone video:', err);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [activeVideo?._id, activeVideo?.status]);

  /**
   * Select and load a Drone Video by ID
   */
  const selectVideo = async (videoId) => {
    try {
      const res = await getDroneVideoById(videoId);
      if (res && res.data) {
        setActiveVideo(res.data);
        if (res.data.status === 'COMPLETED') {
          fetchDetections(videoId);
        } else {
          setDetections([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch video details:', err);
    }
  };

  /**
   * Fetch Detections for Completed Video
   */
  const fetchDetections = async (videoId) => {
    setIsLoadingDetections(true);
    try {
      const res = await getDroneVideoDetections(videoId);
      if (res && res.data && res.data.detections) {
        setDetections(res.data.detections);
      }
    } catch (err) {
      console.error('Failed to fetch detections:', err);
    } finally {
      setIsLoadingDetections(false);
    }
  };

  /**
   * Video File Selection Handler
   */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const validExts = ['.mp4', '.mov', '.webm', '.mkv'];

    if (!allowedTypes.includes(file.type.toLowerCase()) && !validExts.includes(ext)) {
      setUploadError('Invalid video format. Please upload MP4, MOV, or WEBM video files.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setUploadError('Video file exceeds maximum 100MB limit.');
      return;
    }

    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
    setUploadError(null);
  };

  /**
   * Start Drone Video Upload & Pipeline Analysis
   */
  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      setUploadError('Please select a drone video file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('video', selectedFile);
    if (selectedMissingId) {
      formData.append('missingPersonId', selectedMissingId);
    }

    try {
      const response = await uploadDroneVideo(formData);
      if (response && response.data) {
        const newVid = response.data;
        setActiveVideo(newVid);
        setSelectedFile(null);
        setFilePreviewUrl(null);
        fetchDroneHistory();
      } else {
        throw new Error('Invalid response from server.');
      }
    } catch (err) {
      setUploadError(err.message || 'Unable to upload drone search video.');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Format Seconds into MM:SS format
   */
  const formatSeconds = (sec) => {
    if (isNaN(sec) || sec === null) return '00:00';
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  /**
   * Seek standard HTML5 Video player to timestamp
   */
  const handleSeekVideo = (timestampSeconds) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = timestampSeconds;
      videoPlayerRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="drone-intelligence-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* PAGE HEADER */}
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Radio size={22} style={{ color: 'var(--sev-high)' }} />
            <h1 className="page-title" style={{ fontSize: '1.4rem', marginBottom: 0 }}>DRONE INTELLIGENCE</h1>
          </div>
          <p className="page-subtitle" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Live mobile drone camera streaming & aerial search video analysis pipeline.
          </p>
        </div>

        {/* MODE TOGGLE SWITCHER */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-elevated)', padding: '0.3rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className={`segmented-btn ${searchMode === 'LIVE_CAMERA' ? 'active' : ''}`}
            onClick={() => setSearchMode('LIVE_CAMERA')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
          >
            <Camera size={16} />
            <span>LIVE CAMERA</span>
          </button>

          <button
            type="button"
            className={`segmented-btn ${searchMode === 'UPLOAD_VIDEO' ? 'active' : ''}`}
            onClick={() => setSearchMode('UPLOAD_VIDEO')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
          >
            <UploadCloud size={16} />
            <span>UPLOAD VIDEO</span>
          </button>
        </div>
      </div>

      {/* MODE 1: LIVE CAMERA SEARCH COMPONENT */}
      {searchMode === 'LIVE_CAMERA' ? (
        <LiveDroneSearch />
      ) : (
        /* MODE 2: EXISTING UPLOAD DRONE VIDEO WORKFLOW */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
          {/* LEFT COLUMN: UPLOAD & ANALYSIS WORKFLOW */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* UPLOAD & CASE ASSOCIATION CARD */}
            <div className="public-form-card" style={{ maxWidth: '100%', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Film size={18} style={{ color: 'var(--sev-high)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>UPLOAD SEARCH FOOTAGE</h3>
              </div>

              {uploadError && (
                <div className="critical-alert-strip" style={{ marginBottom: '1rem' }}>
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* FILE DROPZONE */}
                <div className="form-group">
                  <label className="input-label">SELECT DRONE VIDEO FOOTAGE</label>
                  {selectedFile ? (
                    <div style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Film size={20} style={{ color: 'var(--sev-high)' }} />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {selectedFile.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <label className="location-detect-btn" style={{ cursor: 'pointer', textAlign: 'center', marginTop: '0.25rem' }}>
                        <span>CHANGE VIDEO</span>
                        <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={handleFileSelect} hidden />
                      </label>
                    </div>
                  ) : (
                    <label className="photo-dropzone" style={{ padding: '1.25rem' }}>
                      <UploadCloud size={28} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>SELECT FOOTAGE</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MP4, MOV, WEBM (Max 100MB)</span>
                      <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={handleFileSelect} hidden />
                    </label>
                  )}
                </div>

                {/* MISSING PERSON TARGET CASE (OPTIONAL) */}
                <div className="form-group">
                  <label className="input-label">SEARCH TARGET (OPTIONAL MISSING CASE)</label>
                  <select
                    className="control-select"
                    style={{ width: '100%', height: '42px', backgroundColor: 'var(--bg-input)' }}
                    value={selectedMissingId}
                    onChange={(e) => setSelectedMissingId(e.target.value)}
                  >
                    <option value="">-- General Search (No specific case) --</option>
                    {missingCases.map((mp) => (
                      <option key={mp._id} value={mp._id}>
                        {mp.caseId} — {mp.name} (Age {mp.age})
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Optionally tag this footage to a missing person record to correlate candidate sightings.
                  </p>
                </div>
              </div>

              {selectedFile && (
                <div className="form-submit-group" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="submit-report-btn"
                    style={{ backgroundColor: 'var(--sev-high)', width: '100%' }}
                    disabled={isUploading}
                    onClick={handleStartAnalysis}
                  >
                    {isUploading ? (
                      <span>UPLOADING FOOTAGE...</span>
                    ) : (
                      <>
                        <Radio size={18} />
                        <span>START VIDEO INTELLIGENCE ANALYSIS</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* ACTIVE VIDEO PROCESSING & TELEMETRY CARD */}
            {activeVideo && (
              <div className="public-form-card" style={{ maxWidth: '100%', padding: '1.25rem', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Radio size={18} style={{ color: 'var(--sev-high)' }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>
                      ANALYSIS TELEMETRY: {activeVideo.filename}
                    </h3>
                  </div>

                  <div>
                    {activeVideo.status === 'PROCESSING' && (
                      <span className="badge-status status-in-progress" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <RotateCw size={12} className="spin" />
                        PROCESSING
                      </span>
                    )}
                    {activeVideo.status === 'UPLOADED' && (
                      <span className="badge-status status-reported">QUEUED</span>
                    )}
                    {activeVideo.status === 'COMPLETED' && (
                      <span className="badge-status status-resolved">ANALYSIS COMPLETE</span>
                    )}
                    {activeVideo.status === 'FAILED' && (
                      <span className="badge-status status-critical">FAILED</span>
                    )}
                  </div>
                </div>

                {/* TELEMETRY METRICS ROW */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>STATUS</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeVideo.status}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>FRAMES ANALYZED</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {activeVideo.processedFrames} {activeVideo.totalFrames > 0 ? `/ ${activeVideo.totalFrames}` : ''}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>PEOPLE DETECTED</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--sev-high)' }}>
                      {activeVideo.personDetectionsCount}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>DURATION</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {formatSeconds(activeVideo.duration)}
                    </span>
                  </div>
                </div>

                {/* ASSOCIATED CASE SUMMARY IF LINKED */}
                {activeVideo.missingPersonId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--sev-high)', borderRadius: '6px' }}>
                    <UserSearch size={16} style={{ color: 'var(--sev-high)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      Associated Missing Person Case: <strong>{activeVideo.missingPersonId.caseId || activeVideo.caseId}</strong> ({activeVideo.missingPersonId.name})
                    </span>
                  </div>
                )}

                {/* PROCESSING IN PROGRESS STATE */}
                {activeVideo.status === 'PROCESSING' && (
                  <div style={{ padding: '1rem', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <div className="dot-pulse" style={{ margin: '0 auto 0.75rem auto' }}></div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>ANALYZING DRONE FOOTAGE</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      Extracting representative video frames and running YOLO object detection to identify visible persons...
                    </p>
                  </div>
                )}

                {/* FAILED STATE */}
                {activeVideo.status === 'FAILED' && (
                  <div className="critical-alert-strip" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={16} />
                      <span style={{ fontWeight: 800 }}>VIDEO ANALYSIS FAILED</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      {activeVideo.error || 'An unexpected error occurred during frame extraction or object detection.'}
                    </span>
                  </div>
                )}

                {/* COMPLETED RESULTS CANDIDATE GALLERY */}
                {activeVideo.status === 'COMPLETED' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                        CANDIDATE SIGHTINGS ({detections.length})
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Sorted by confidence descending
                      </span>
                    </div>

                    {isLoadingDetections ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                        Loading candidate frames...
                      </div>
                    ) : detections.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-elevated)', borderRadius: '6px' }}>
                        <Eye size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800 }}>NO PERSONS DETECTED</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          No visible persons exceeded the detection confidence threshold in this search video.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                        {detections.map((det) => {
                          const fullFrameUrl = getImageUrl(det.frameUrl);
                          const confPct = Math.round(det.confidence * 100);

                          return (
                            <div
                              key={det._id}
                              style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease, border-color 0.15s ease'
                              }}
                              onClick={() => setSelectedDetection(det)}
                            >
                              <div style={{ width: '100%', height: '140px', background: '#000', overflow: 'hidden', position: 'relative' }}>
                                <img src={fullFrameUrl} alt="Detection Frame" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                <div style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  background: 'rgba(0,0,0,0.85)',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  color: 'var(--sev-success)'
                                }}>
                                  {confPct}% CONFIDENCE
                                </div>
                              </div>

                              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span className="dot-pulse" style={{ background: 'var(--sev-high)', width: '6px', height: '6px' }}></span>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--sev-high)' }}>
                                    POSSIBLE PERSON SIGHTING
                                  </span>
                                </div>

                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Clock size={12} />
                                  <span>Timestamp: <strong>{formatSeconds(det.timestampSeconds)}</strong></span>
                                </div>

                                <button
                                  className="btn-view-action"
                                  style={{ marginTop: '0.35rem', width: '100%', fontSize: '0.7rem' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDetection(det);
                                  }}
                                >
                                  VIEW FRAME DETAILS
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: RECENT DRONE SEARCH FOOTAGE HISTORY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="public-form-card" style={{ maxWidth: '100%', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Film size={16} style={{ color: 'var(--text-muted)' }} />
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800 }}>SEARCH FOOTAGE HISTORY</h4>
                </div>
                <button
                  className="drawer-close-btn"
                  title="Refresh history"
                  onClick={fetchDroneHistory}
                >
                  <RotateCw size={14} />
                </button>
              </div>

              {isLoadingHistory ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                  Loading footage logs...
                </div>
              ) : videoHistory.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                  No uploaded search video records.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {videoHistory.map((vid) => {
                    const isSelected = activeVideo && activeVideo._id === vid._id;
                    return (
                      <div
                        key={vid._id}
                        style={{
                          padding: '0.65rem 0.75rem',
                          borderRadius: '6px',
                          background: isSelected ? 'var(--bg-input)' : 'var(--bg-elevated)',
                          border: isSelected ? '1px solid var(--sev-high)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => selectVideo(vid._id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                            {vid.filename}
                          </span>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            background: vid.status === 'COMPLETED' ? 'rgba(34, 197, 94, 0.15)' : vid.status === 'PROCESSING' ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg-input)',
                            color: vid.status === 'COMPLETED' ? 'var(--sev-success)' : vid.status === 'PROCESSING' ? 'var(--sev-medium)' : 'var(--text-muted)'
                          }}>
                            {vid.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          <span>Detections: <strong>{vid.personDetectionsCount || 0}</strong></span>
                          <span>{formatDateTime(vid.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FRAME & VIDEO REVIEW MODAL */}
      {selectedDetection && activeVideo && (
        <div className="drawer-backdrop" onClick={() => setSelectedDetection(null)}>
          <div className="modal-container" style={{ maxWidth: '780px', padding: '1.25rem', gap: '1rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} style={{ color: 'var(--sev-high)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>
                  PERSON SIGHTING CANDIDATE REVIEW
                </h3>
              </div>
              <button className="drawer-close-btn" onClick={() => setSelectedDetection(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* LEFT: DETECTED FRAME IMAGE WITH BOUNDING BOX */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="input-label" style={{ marginBottom: 0 }}>EXTRACTED ANNOTATED FRAME</span>
                <div style={{ width: '100%', height: '240px', background: '#000', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img
                    src={getImageUrl(selectedDetection.frameUrl)}
                    alt="Frame Detection"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>

              {/* RIGHT: ORIGINAL VIDEO PLAYER WITH JUMP TO TIMESTAMP */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span className="input-label" style={{ marginBottom: 0 }}>FOOTAGE SEEKER</span>
                <div style={{ width: '100%', height: '240px', background: '#000', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <video
                    ref={videoPlayerRef}
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    src={getImageUrl(activeVideo.videoUrl)}
                  />
                </div>
              </div>
            </div>

            {/* DETAILED CANDIDATE METRICS */}
            <div style={{ background: 'var(--bg-elevated)', padding: '0.85rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>DETECTION CONFIDENCE</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--sev-success)' }}>
                  {Math.round(selectedDetection.confidence * 100)}%
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>TIMESTAMP</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {formatSeconds(selectedDetection.timestampSeconds)} (Frame {selectedDetection.frameNumber})
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>BOUNDING BOX</span>
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {selectedDetection.boundingBox ? `[${selectedDetection.boundingBox.x}, ${selectedDetection.boundingBox.y}, ${selectedDetection.boundingBox.width}x${selectedDetection.boundingBox.height}]` : 'N/A'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <button
                  className="secondary-action-btn"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', gap: '0.35rem' }}
                  onClick={() => handleSeekVideo(selectedDetection.timestampSeconds)}
                >
                  <Play size={12} />
                  <span>JUMP TO TIMESTAMP</span>
                </button>
              </div>
            </div>

            {/* DISCLOSURE FOOTER */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
              <ShieldAlert size={14} />
              <span>Phase 7 object detection identifies visible persons in aerial footage. Face candidate matching occurs in Phase 8.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DroneIntelligence;
