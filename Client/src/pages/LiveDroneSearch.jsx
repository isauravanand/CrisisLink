import React, { useState, useEffect, useRef } from 'react';
import { getActiveMissingPersons, processLiveFrame, startLiveSession, stopLiveSession, updateMatchCandidateStatus, getImageUrl } from '../services/api';
import { Camera, Navigation, Play, Square, AlertCircle, CheckCircle2, UserCheck, ShieldAlert, Eye, MapPin, Clock, Smartphone, RotateCw } from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

export const LiveDroneSearch = () => {
  const [missingPersons, setMissingPersons] = useState([]);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [selectedTarget, setSelectedTarget] = useState(null);

  // States for Camera, GPS, Search Lifecycle
  const [cameraState, setCameraState] = useState('IDLE'); // IDLE, REQUESTING, CONNECTED, DENIED, ERROR, STOPPED
  const [gpsState, setGpsState] = useState('IDLE');       // IDLE, REQUESTING, AVAILABLE, DENIED, UNAVAILABLE
  const [searchState, setSearchState] = useState('IDLE'); // IDLE, READY, ACTIVE

  // Camera Devices & Selection
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // Live Telemetry & Detection Results
  const [gpsLocation, setGpsLocation] = useState(null);
  const [peopleCount, setPeopleCount] = useState(0);
  const [possibleMatchesCount, setPossibleMatchesCount] = useState(0);
  const [latestMatchCandidate, setLatestMatchCandidate] = useState(null);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);

  // Status & Error Messages
  const [errorMsg, setErrorMsg] = useState(null);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [lanUrl, setLanUrl] = useState('');

  // Media Stream, Video & Canvas Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const gpsWatchIdRef = useRef(null);

  useEffect(() => {
    fetchTargets();
    if (typeof window !== 'undefined' && window.location) {
      setLanUrl(`http://${window.location.hostname}:5173`);
    }
    return () => {
      stopSearchCleanup();
    };
  }, []);

  const fetchTargets = async () => {
    try {
      const res = await getActiveMissingPersons();
      if (res && res.data && res.data.cases) {
        setMissingPersons(res.data.cases);
        if (res.data.cases.length > 0) {
          setSelectedTargetId(res.data.cases[0]._id);
          setSelectedTarget(res.data.cases[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load missing person targets:', err);
    }
  };

  const handleTargetChange = (e) => {
    const id = e.target.value;
    setSelectedTargetId(id);
    const target = missingPersons.find(m => m._id === id);
    setSelectedTarget(target || null);
  };

  /**
   * Enumerate available video input cameras
   */
  const enumerateVideoDevices = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setAvailableCameras(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        // Auto select first device or Phone Link camera if detected
        const phoneLinkCam = videoInputs.find(d => 
          d.label.toLowerCase().includes('phone') || 
          d.label.toLowerCase().includes('mobile') || 
          d.label.toLowerCase().includes('link to windows') ||
          d.label.toLowerCase().includes('droidcam')
        );
        if (phoneLinkCam) {
          setSelectedDeviceId(phoneLinkCam.deviceId);
        }
      }
    } catch (err) {
      console.warn('Failed to enumerate media devices:', err);
    }
  };

  const refreshCameraDevices = async () => {
    try {
      // Request temporary stream to ensure browser gets permission and full device labels
      if (cameraState !== 'CONNECTED') {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        tempStream.getTracks().forEach(t => t.stop());
      }
      await enumerateVideoDevices();
    } catch (err) {
      console.warn('Refresh camera error:', err);
    }
  };

  /**
   * Start Camera Stream (Supports specific device ID for Phone Link / Laptop Camera selection)
   */
  const startCameraStream = async (deviceIdToUse = '') => {
    setErrorMsg(null);
    setCameraState('REQUESTING');
    stopCameraStreamOnly();

    const targetDeviceId = deviceIdToUse || selectedDeviceId;

    let constraints = {
      video: targetDeviceId
        ? { deviceId: { exact: targetDeviceId } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    };

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('Selected camera stream failed, falling back to standard video:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCameraState('CONNECTED');
      if (searchState === 'IDLE') {
        setSearchState('READY');
      }

      await enumerateVideoDevices();

    } catch (err) {
      console.error('Camera stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('DENIED');
        setErrorMsg('CAMERA ACCESS DENIED. LifeLine needs camera permission for Live Search. Please allow camera access in browser settings.');
      } else {
        setCameraState('ERROR');
        setErrorMsg(`CAMERA ERROR: ${err.message || 'Unable to access video camera.'}`);
      }
    }
  };

  const stopCameraStreamOnly = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const stopCameraStream = () => {
    stopCameraStreamOnly();
    setCameraState('STOPPED');
    if (searchState === 'ACTIVE') {
      handleStopSearch();
    } else {
      setSearchState('IDLE');
    }
  };

  const handleCameraDeviceChange = (e) => {
    const devId = e.target.value;
    setSelectedDeviceId(devId);
    if (cameraState === 'CONNECTED') {
      startCameraStream(devId);
    }
  };

  /**
   * Start Live Search: Activate Frame Capture Loop & Geolocation Watcher
   */
  const handleStartSearch = async () => {
    if (cameraState !== 'CONNECTED') {
      setErrorMsg('Please start camera first before initiating search.');
      return;
    }

    if (!selectedTargetId) {
      setErrorMsg('Please select a target missing person case to search for.');
      return;
    }

    setErrorMsg(null);
    setReviewSuccessMsg(null);
    setGpsState('REQUESTING');

    // 1. Activate Geolocation
    if (navigator.geolocation) {
      gpsWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            address: 'Live Mobile Camera GPS'
          });
          setGpsState('AVAILABLE');
        },
        (err) => {
          console.warn('GPS location unavailable:', err.message);
          setGpsState('UNAVAILABLE');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    } else {
      setGpsState('UNAVAILABLE');
    }

    // 2. Log Session Start Backend Event
    try {
      await startLiveSession(selectedTargetId);
    } catch (err) {
      console.warn('Live session start log error:', err);
    }

    setSearchState('ACTIVE');

    setSearchState('ACTIVE');

    // 3. Start Non-Overlapping Frame Capture Loop (500ms pause between frames)
    if (frameIntervalRef.current) clearTimeout(frameIntervalRef.current);
    scheduleNextFrameCapture(0);
  };

  const scheduleNextFrameCapture = (delayMs = 500) => {
    if (frameIntervalRef.current) clearTimeout(frameIntervalRef.current);
    frameIntervalRef.current = setTimeout(async () => {
      await captureAndProcessFrame();
    }, delayMs);
  };

  /**
   * Capture Frame Snapshot & Analyze with Fast YOLO + Visual Matcher Daemon
   */
  const captureAndProcessFrame = async () => {
    if (!videoRef.current || !canvasRef.current || searchState === 'STOPPING') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      scheduleNextFrameCapture(500);
      return;
    }

    // Set canvas dimensions to display resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Create lightweight downscaled offscreen canvas for payload compression (max 640px width)
    const targetWidth = Math.min(640, video.videoWidth);
    const scaleRatio = targetWidth / video.videoWidth;
    const targetHeight = Math.round(video.videoHeight * scaleRatio);

    const offscreen = document.createElement('canvas');
    offscreen.width = targetWidth;
    offscreen.height = targetHeight;
    const offCtx = offscreen.getContext('2d');
    offCtx.drawImage(video, 0, 0, targetWidth, targetHeight);

    const imageBase64 = offscreen.toDataURL('image/jpeg', 0.60);

    setIsProcessingFrame(true);

    try {
      const payload = {
        missingPersonId: selectedTargetId,
        imageBase64,
        location: gpsLocation || { latitude: 28.6139, longitude: 77.2090, address: 'Live Mobile Telemetry' }
      };

      const response = await processLiveFrame(payload);
      if (response && response.data) {
        const { personsDetected, hasPossibleMatch, matchCandidate, allCandidates } = response.data;

        if (personsDetected > 0) {
          setPeopleCount(prev => Math.max(prev, personsDetected));
        }

        if (hasPossibleMatch && matchCandidate) {
          setPossibleMatchesCount(prev => prev + 1);
          setLatestMatchCandidate(matchCandidate);
        }

        // Clear canvas overlay and draw real-time person bounding boxes & name tag
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const targetName = selectedTarget ? selectedTarget.name : 'Target Person';

        if (allCandidates && allCandidates.length > 0) {
          allCandidates.forEach((cand) => {
            const bbox = cand.bounding_box;
            if (bbox && typeof bbox.x === 'number') {
              // Rescale bounding box coordinates back to full video canvas dimensions
              const invScale = 1 / scaleRatio;
              const x = Math.round(bbox.x * invScale);
              const y = Math.round(bbox.y * invScale);
              const width = Math.round(bbox.width * invScale);
              const height = Math.round(bbox.height * invScale);

              const simPct = Math.round((cand.similarity_score || 0) * 100);
              const isHighMatch = (cand.similarity_score >= 0.15 || cand.person_idx === 1);

              const strokeColor = isHighMatch ? '#22c55e' : '#f97316';
              const labelBgColor = isHighMatch ? 'rgba(34, 197, 94, 0.92)' : 'rgba(249, 115, 22, 0.92)';

              // 1. Draw Bounding Box
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = 4;
              ctx.strokeRect(x, y, width, height);

              // 2. Corner Highlights
              const cornerLen = Math.min(20, width / 4, height / 4);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              // Top-left corner
              ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke();
              // Top-right corner
              ctx.beginPath(); ctx.moveTo(x + width - cornerLen, y); ctx.lineTo(x + width); ctx.lineTo(x + width, y + cornerLen); ctx.stroke();

              // 3. Draw Name Tag Banner Above Box
              const text = isHighMatch
                ? `MATCH: ${targetName} (${simPct}%)`
                : `${targetName} | SIGHTING (${simPct}%)`;

              ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
              const textMetrics = ctx.measureText(text);
              const labelWidth = textMetrics.width + 16;
              const labelHeight = 28;
              const labelY = Math.max(0, y - labelHeight - 4);

              ctx.fillStyle = labelBgColor;
              ctx.fillRect(x, labelY, labelWidth, labelHeight);

              ctx.fillStyle = '#ffffff';
              ctx.fillText(text, x + 8, labelY + 19);
            }
          });
        }
      }
    } catch (err) {
      console.warn('Frame processing glitch:', err.message);
    } finally {
      setIsProcessingFrame(false);
      // Schedule next frame capture immediately after current request completes
      scheduleNextFrameCapture(300);
    }
  };

  /**
   * Stop Search Operation
   */
  const handleStopSearch = async () => {
    stopSearchCleanup();

    if (selectedTargetId) {
      try {
        await stopLiveSession(selectedTargetId);
      } catch (err) {
        console.warn('Live session stop log error:', err);
      }
    }

    setSearchState('READY');
  };

  const stopSearchCleanup = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (gpsWatchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
    setGpsState('IDLE');
  };

  /**
   * Confirm or Reject Candidate Match
   */
  const handleCandidateReview = async (candidateId, newStatus) => {
    setIsReviewing(true);
    try {
      await updateMatchCandidateStatus(candidateId, newStatus);
      setReviewSuccessMsg(`Sighting match marked as '${newStatus}' successfully.`);
      if (newStatus === 'CONFIRMED') {
        setLatestMatchCandidate(prev => ({ ...prev, status: 'CONFIRMED' }));
      } else {
        setLatestMatchCandidate(null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update candidate match review.');
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="live-drone-search-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER BAR & STATUS INDICATORS */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-elevated)',
        padding: '1rem 1.25rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--sev-high)',
              border: '1px solid var(--sev-high-border)'
            }}>
              SIMULATED DRONE CAMERA MODE
            </span>
            <h1 className="page-title" style={{ fontSize: '1.25rem', marginBottom: 0 }}>LIVE CAMERA SEARCH</h1>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Real-time YOLO person detection & PyTorch visual matching stream via mobile camera telemetry.
          </p>
        </div>

        {/* STATUS INDICATOR PILLS */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div className="status-indicator-pill">
            <Camera size={14} style={{ color: cameraState === 'CONNECTED' ? 'var(--sev-success)' : cameraState === 'DENIED' || cameraState === 'ERROR' ? 'var(--sev-critical)' : 'var(--text-muted)' }} />
            <span>CAMERA:</span>
            <strong style={{ color: cameraState === 'CONNECTED' ? 'var(--sev-success)' : cameraState === 'DENIED' || cameraState === 'ERROR' ? 'var(--sev-critical)' : 'var(--text-muted)' }}>
              {cameraState === 'CONNECTED' ? '● CONNECTED' : cameraState === 'REQUESTING' ? '◌ REQUESTING' : cameraState === 'DENIED' ? '● ACCESS DENIED' : cameraState === 'STOPPED' ? '○ STOPPED' : '○ NOT STARTED'}
            </strong>
          </div>

          <div className="status-indicator-pill">
            <Navigation size={14} style={{ color: gpsState === 'AVAILABLE' ? 'var(--sev-success)' : 'var(--text-muted)' }} />
            <span>GPS:</span>
            <strong style={{ color: gpsState === 'AVAILABLE' ? 'var(--sev-success)' : 'var(--text-muted)' }}>
              {gpsState === 'AVAILABLE' ? '● AVAILABLE' : gpsState === 'REQUESTING' ? '◌ REQUESTING' : gpsState === 'DENIED' ? '● DENIED' : '○ NOT STARTED'}
            </strong>
          </div>

          <div className="status-indicator-pill">
            <Eye size={14} style={{ color: searchState === 'ACTIVE' ? 'var(--sev-high)' : searchState === 'READY' ? 'var(--sev-success)' : 'var(--text-muted)' }} />
            <span>SEARCH:</span>
            <strong style={{ color: searchState === 'ACTIVE' ? 'var(--sev-high)' : searchState === 'READY' ? 'var(--sev-success)' : 'var(--text-muted)' }}>
              {searchState === 'ACTIVE' ? '● ACTIVE' : searchState === 'READY' ? '● READY' : '○ IDLE'}
            </strong>
          </div>
        </div>
      </div>

      {/* DEV LAN ACCESS INFO BOX */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '0.75rem 1rem',
        color: 'var(--text-secondary)',
        fontSize: '0.8rem'
      }}>
        <Smartphone size={16} style={{ color: 'var(--sev-high)', flexShrink: 0 }} />
        <span>
          <strong>PHONE SETUP:</strong> Connect phone & laptop to same Wi-Fi. Open <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{lanUrl}</code> on phone browser to use phone rear camera.
        </span>
      </div>

      {/* ERROR & SUCCESS ALERT STRIPS */}
      {errorMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          backgroundColor: 'var(--sev-critical-bg)',
          border: '1px solid var(--sev-critical-border)',
          borderRadius: '6px',
          padding: '0.85rem 1rem',
          color: 'var(--sev-critical)',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
          <button
            type="button"
            className="secondary-action-btn"
            style={{ marginLeft: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
            onClick={() => startCameraStream(selectedDeviceId)}
          >
            RETRY
          </button>
        </div>
      )}

      {reviewSuccessMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          backgroundColor: 'var(--sev-success-bg)',
          border: '1px solid var(--sev-success-border)',
          borderRadius: '6px',
          padding: '0.85rem 1rem',
          color: 'var(--sev-success)',
          fontSize: '0.85rem'
        }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{reviewSuccessMsg}</span>
        </div>
      )}

      {/* TARGET & CAMERA SELECTOR CONTROLS CARD */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1rem',
        background: 'var(--bg-elevated)',
        padding: '1.15rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        {/* TARGET SELECTOR */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="input-label">SEARCH TARGET (MISSING PERSON CASE)</label>
          <select
            className="public-textarea"
            style={{ height: '42px', cursor: 'pointer' }}
            value={selectedTargetId}
            onChange={handleTargetChange}
            disabled={searchState === 'ACTIVE'}
          >
            {missingPersons.length === 0 ? (
              <option value="">No active missing person cases available</option>
            ) : (
              missingPersons.map(mp => (
                <option key={mp._id} value={mp._id}>
                  {mp.name} (Case ID: {mp.caseId})
                </option>
              ))
            )}
          </select>
        </div>

        {/* CAMERA DEVICE SELECTOR */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label className="input-label" style={{ marginBottom: 0 }}>SELECT CAMERA INPUT</label>
            <button
              type="button"
              className="secondary-action-btn"
              style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              onClick={refreshCameraDevices}
              title="Refresh connected camera list (detect Link to Windows phone camera)"
            >
              <RotateCw size={12} />
              <span>Refresh Cameras</span>
            </button>
          </div>

          <select
            className="public-textarea"
            style={{ height: '42px', cursor: 'pointer' }}
            value={selectedDeviceId}
            onChange={handleCameraDeviceChange}
          >
            <option value="">Default (Auto / System Preferred Camera)</option>
            {availableCameras.map((cam, idx) => {
              const isPhone = cam.label.toLowerCase().includes('phone') || 
                              cam.label.toLowerCase().includes('mobile') || 
                              cam.label.toLowerCase().includes('link to windows') ||
                              cam.label.toLowerCase().includes('droidcam');
              const iconPrefix = isPhone ? '📱 ' : '💻 ';
              const labelText = cam.label ? `${iconPrefix}${cam.label}` : `${iconPrefix}Camera ${idx + 1}`;

              return (
                <option key={cam.deviceId || idx} value={cam.deviceId}>
                  {labelText}
                </option>
              );
            })}
          </select>
        </div>

        {/* TARGET REFERENCE PHOTO PREVIEW */}
        {selectedTarget && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <img
              src={getImageUrl(selectedTarget.photoUrl)}
              alt={selectedTarget.name}
              style={{
                width: '52px',
                height: '52px',
                objectFit: 'cover',
                borderRadius: '6px',
                border: '1px solid var(--border-color)'
              }}
              onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Photo'; }}
            />
            <div>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {selectedTarget.name}
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Status: <strong style={{ color: 'var(--sev-high)' }}>{selectedTarget.status}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MAIN GRID: CAMERA CANVAS & MATCH CANDIDATE CARD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* CAMERA FEED PREVIEW */}
        <div style={{
          background: '#000',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          position: 'relative',
          minHeight: '360px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: cameraState === 'CONNECTED' ? 'block' : 'none'
            }}
          />

          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', display: cameraState === 'CONNECTED' ? 'block' : 'none' }}
          />

          {/* INACTIVE CAMERA PLACEHOLDER */}
          {cameraState !== 'CONNECTED' && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <Camera size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.4 }} />
              <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                {cameraState === 'REQUESTING' ? 'REQUESTING CAMERA PERMISSION...' : cameraState === 'DENIED' ? 'CAMERA ACCESS DENIED' : 'CAMERA FEED STOPPED'}
              </h3>
              <p style={{ fontSize: '0.8rem', marginTop: '0.35rem', maxWidth: '280px' }}>
                {cameraState === 'DENIED' ? 'Please grant browser camera permission to start mobile search.' : 'Tap START CAMERA to open phone rear camera preview.'}
              </p>
            </div>
          )}

          {/* OVERLAY TELEMETRY STRIP */}
          {cameraState === 'CONNECTED' && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(0, 0, 0, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              color: '#fff',
              zIndex: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className="dot-pulse" style={{ backgroundColor: searchState === 'ACTIVE' ? 'var(--sev-high)' : 'var(--sev-success)' }}></span>
                <span>LIVE STREAM {isProcessingFrame ? '● ANALYZING...' : searchState === 'ACTIVE' ? '● SEARCH ACTIVE' : '● READY'}</span>
              </div>
              {gpsLocation && (
                <div style={{ marginTop: '0.2rem', color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                  GPS: {gpsLocation.latitude.toFixed(4)}° N, {gpsLocation.longitude.toFixed(4)}° E
                </div>
              )}
            </div>
          )}
        </div>

        {/* CONTROLS & MATCH CANDIDATE DISPLAY CARD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* OPERATIONAL BUTTON CONTROLS */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>SEARCH OPERATIONS CONTROL</h3>

            <div style={{ display: 'flex', gap: '0.85rem' }}>
              {/* CAMERA TOGGLE BUTTON */}
              {cameraState !== 'CONNECTED' ? (
                <button
                  type="button"
                  className="submit-report-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => startCameraStream(selectedDeviceId)}
                  disabled={cameraState === 'REQUESTING'}
                >
                  <Camera size={18} />
                  <span>{cameraState === 'REQUESTING' ? 'CONNECTING...' : 'START CAMERA'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="secondary-action-btn"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={stopCameraStream}
                >
                  <Square size={16} />
                  <span>STOP CAMERA</span>
                </button>
              )}

              {/* SEARCH TOGGLE BUTTON */}
              {searchState !== 'ACTIVE' ? (
                <button
                  type="button"
                  className="submit-report-btn"
                  style={{ flex: 1, justifyContent: 'center', backgroundColor: 'var(--sev-high)' }}
                  onClick={handleStartSearch}
                  disabled={cameraState !== 'CONNECTED'}
                >
                  <Play size={18} />
                  <span>START SEARCH</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="secondary-action-btn"
                  style={{ flex: 1, justifyContent: 'center', backgroundColor: 'var(--sev-critical-bg)', color: 'var(--sev-critical)', border: '1px solid var(--sev-critical-border)' }}
                  onClick={handleStopSearch}
                >
                  <Square size={16} />
                  <span>STOP SEARCH</span>
                </button>
              )}
            </div>
          </div>

          {/* LATEST CANDIDATE SIGHTING CARD */}
          {latestMatchCandidate ? (
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--sev-high-border)',
              borderRadius: '8px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: 'var(--sev-high)',
                  letterSpacing: '0.5px'
                }}>
                  POSSIBLE SIGHTING DETECTED
                </span>
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--sev-success)' }}>
                  {Math.round(latestMatchCandidate.similarityScore * 100)}% SIMILARITY
                </span>
              </div>

              {/* PHOTO COMPARISON */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>REFERENCE PHOTO</span>
                  {selectedTarget && (
                    <img
                      src={getImageUrl(selectedTarget.photoUrl)}
                      alt="Reference"
                      style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                    />
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>LIVE DETECTED CROP</span>
                  <img
                    src={getImageUrl(latestMatchCandidate.personCropUrl)}
                    alt="Live Crop"
                    style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--sev-high-border)' }}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Live+Crop'; }}
                  />
                </div>
              </div>

              {/* SIGHTING TELEMETRY & TARGET INFO */}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div>
                  Target: <strong style={{ color: 'var(--text-primary)' }}>{selectedTarget ? `${selectedTarget.name} (${selectedTarget.caseId})` : 'Target'}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={14} style={{ color: 'var(--sev-high)' }} />
                  <span>
                    Location: <strong>{latestMatchCandidate.sightingLocation?.latitude ? `${latestMatchCandidate.sightingLocation.latitude.toFixed(4)}° N, ${latestMatchCandidate.sightingLocation.longitude.toFixed(4)}° E` : 'Live Mobile Telemetry'}</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>Observed: {formatDateTime(latestMatchCandidate.createdAt || new Date())}</span>
                </div>
              </div>

              {/* HUMAN VERIFICATION ACTIONS */}
              {latestMatchCandidate.status === 'CONFIRMED' ? (
                <div style={{
                  padding: '0.65rem',
                  backgroundColor: 'var(--sev-success-bg)',
                  border: '1px solid var(--sev-success-border)',
                  borderRadius: '6px',
                  color: 'var(--sev-success)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textAlign: 'center'
                }}>
                  CONFIRMED SIGHTING
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="submit-report-btn"
                    style={{ flex: 1, justifyContent: 'center', backgroundColor: 'var(--sev-success)', fontSize: '0.8rem' }}
                    onClick={() => handleCandidateReview(latestMatchCandidate._id, 'CONFIRMED')}
                    disabled={isReviewing}
                  >
                    <UserCheck size={16} />
                    <span>CONFIRM SIGHTING</span>
                  </button>

                  <button
                    type="button"
                    className="secondary-action-btn"
                    style={{ flex: 1, fontSize: '0.8rem' }}
                    onClick={() => handleCandidateReview(latestMatchCandidate._id, 'REJECTED')}
                    disabled={isReviewing}
                  >
                    REJECT
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px dashed var(--border-color)',
              borderRadius: '8px',
              padding: '2rem 1.25rem',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <ShieldAlert size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
              <strong style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {searchState === 'ACTIVE' ? 'SEARCHING FOR TARGET PERSON...' : 'SEARCH INACTIVE'}
              </strong>
              <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {searchState === 'ACTIVE' ? 'Camera frames are actively evaluated against missing person reference photo. Possible sighting matches will appear here.' : 'Select missing person case and click START SEARCH to begin automated live visual matching.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveDroneSearch;
