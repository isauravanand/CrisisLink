import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import { createMissingPerson } from '../services/api';
import { saveOfflineReport } from '../utils/offlineSync';
import { Camera, Navigation, AlertCircle, UploadCloud, CheckCircle2, ChevronLeft, UserSearch, ShieldCheck, WifiOff } from 'lucide-react';

export const MissingPerson = () => {
  // Form Fields
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [lastSeenAt, setLastSeenAt] = useState('');
  const [clothingDescription, setClothingDescription] = useState('');
  const [identifyingFeatures, setIdentifyingFeatures] = useState('');
  const [description, setDescription] = useState('');

  // Location State
  const [location, setLocation] = useState({ latitude: 28.6139, longitude: 77.2090, address: '' });
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Status & Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [registeredCase, setRegisteredCase] = useState(null);
  const [offlineSuccessRecord, setOfflineSuccessRecord] = useState(null);

  /**
   * Photo Selection Handler
   */
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side file type & size check
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setFormError('Only JPEG, PNG, and WEBP image files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Photo size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setFormError(null);
  };

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
      (err) => {
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Report will use default coordinates.');
        } else {
          setLocationError('Unable to retrieve location.');
        }
      },
      { timeout: 10000 }
    );
  };

  /**
   * Submit Missing Person Registration Form
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!photoFile) {
      setFormError('A clear photograph of the missing person is required.');
      return;
    }

    if (!name || name.trim().length === 0) {
      setFormError('Please enter full name.');
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setFormError('Please enter a valid age between 1 and 120.');
      return;
    }

    if (!lastSeenAt) {
      setFormError('Please select last seen date and time.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      name: name.trim(),
      age: parsedAge,
      gender,
      lastSeenAt: new Date(lastSeenAt).toISOString(),
      clothingDescription: clothingDescription.trim(),
      identifyingFeatures: identifyingFeatures.trim(),
      description: description.trim(),
      lastSeenLocation: location,
      photo: photoFile
    };

    try {
      if (!navigator.onLine) {
        const offlineRecord = await saveOfflineReport(payload, 'MISSING_PERSON');
        setOfflineSuccessRecord(offlineRecord);
        return;
      }

      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('name', name.trim());
      formData.append('age', parsedAge);
      formData.append('gender', gender);
      formData.append('lastSeenAt', new Date(lastSeenAt).toISOString());
      formData.append('clothingDescription', clothingDescription.trim());
      formData.append('identifyingFeatures', identifyingFeatures.trim());
      formData.append('description', description.trim());
      formData.append('lastSeenLocation', JSON.stringify(location));

      const response = await createMissingPerson(formData);
      if (response && response.data) {
        setRegisteredCase(response.data);
      } else {
        throw new Error('Invalid response from server.');
      }
    } catch (err) {
      console.warn('[MissingPerson] Online submit failed, storing offline:', err);
      try {
        const offlineRecord = await saveOfflineReport(payload, 'MISSING_PERSON');
        setOfflineSuccessRecord(offlineRecord);
      } catch (saveErr) {
        setFormError(err.message || 'Unable to submit missing person report. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
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
              <h2 style={{ fontSize: '1.25rem', color: '#f59e0b', margin: 0 }}>OFFLINE MISSING PERSON REPORT STORED</h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>You are currently offline. Your missing person report and photograph have been saved safely on your device.</p>
            </div>
            <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
              <span className="input-label" style={{ fontSize: '0.7rem' }}>OFFLINE QUEUE REFERENCE ID</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {offlineSuccessRecord.offlineId}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '0.85rem 1rem', color: '#f59e0b', fontSize: '0.825rem', textAlign: 'left' }}>
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <span><strong>Automatic Transmission:</strong> When your device regains internet connection, this report will automatically sync to the admin command center.</span>
            </div>
            <button type="button" className="secondary-action-btn" onClick={() => { setOfflineSuccessRecord(null); setName(''); setPhotoFile(null); setPhotoPreview(null); }}>
              REPORT ANOTHER MISSING PERSON
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="public-page-layout">
      <PublicHeader />

      <main className="form-container">
        {/* SUCCESS CONFIRMATION VIEW */}
        {registeredCase ? (
          <div className="public-form-card" style={{ textAlign: 'center', gap: '1.5rem' }}>
            <div className="status-hero-box" style={{ margin: '0 auto' }}>
              <span className="dot-pulse"></span>
              <span className="status-hero-title">MISSING PERSON REPORT RECEIVED</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <span className="id-label">OFFICIAL CASE REFERENCE ID</span>
              <h2 className="id-value" style={{ fontSize: '1.8rem', color: 'var(--text-primary)' }}>
                {registeredCase.caseId}
              </h2>
            </div>

            <div style={{
              width: '120px',
              height: '120px',
              margin: '0 auto',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '2px solid var(--border-color)'
            }}>
              <img
                src={`http://localhost:5000${registeredCase.photoUrl}`}
                alt={registeredCase.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
              Keep this Case ID (<strong>{registeredCase.caseId}</strong>) for future reference. Responders have received the missing person record.
            </p>

            <div className="form-submit-group" style={{ flexDirection: 'row', gap: '1rem' }}>
              <button
                className="secondary-action-btn"
                onClick={() => {
                  setRegisteredCase(null);
                  setPhotoFile(null);
                  setPhotoPreview(null);
                  setName('');
                  setAge('');
                }}
              >
                REGISTER ANOTHER CASE
              </button>
              <Link to="/" className="public-back-link">
                <ChevronLeft size={16} />
                <span>HOME</span>
              </Link>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <form onSubmit={handleSubmit} className="public-form-card">
            <div className="form-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserSearch size={22} style={{ color: 'var(--sev-high)' }} />
                <h2 className="form-title">REPORT A MISSING PERSON</h2>
              </div>
              <p className="form-subtitle">
                Provide accurate details and a clear photograph to help response teams identify and locate the person.
              </p>
            </div>

            {formError && (
              <div className="critical-alert-strip">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {/* PHOTOGRAPH UPLOAD DROPZONE */}
            <div className="form-group">
              <label className="input-label">PHOTOGRAPH (REQUIRED FOR VISUAL MATCHING)</label>

              {photoPreview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '140px',
                    height: '140px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-input)'
                  }}>
                    <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <label className="location-detect-btn" style={{ cursor: 'pointer' }}>
                    <Camera size={14} />
                    <span>CHANGE PHOTO</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} hidden />
                  </label>
                </div>
              ) : (
                <label className="photo-dropzone">
                  <UploadCloud size={32} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>ADD PHOTOGRAPH</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click to upload clear photo (JPEG, PNG, WEBP max 5MB)</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} hidden required />
                </label>
              )}

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                "For best matching results, use a clear photo where the person's face is visible."
              </p>
            </div>

            {/* DEMOGRAPHICS */}
            <div className="form-group">
              <label className="input-label">FULL NAME</label>
              <input
                type="text"
                className="search-input"
                style={{ paddingLeft: '0.85rem' }}
                placeholder="First and last name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="segmented-grid">
              <div className="form-group">
                <label className="input-label">AGE</label>
                <input
                  type="number"
                  className="public-number-input"
                  min={1}
                  max={120}
                  placeholder="e.g. 24"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="input-label">GENDER</label>
                <select
                  className="control-select"
                  style={{ width: '100%', height: '42px' }}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* LAST SEEN DATE & TIME */}
            <div className="form-group">
              <label className="input-label">LAST SEEN DATE & TIME</label>
              <input
                type="datetime-local"
                className="public-number-input"
                style={{ fontFamily: 'var(--font-main)', fontSize: '0.85rem' }}
                value={lastSeenAt}
                onChange={(e) => setLastSeenAt(e.target.value)}
                required
              />
            </div>

            {/* CLOTHING & FEATURES */}
            <div className="form-group">
              <label className="input-label">WHAT WERE THEY WEARING?</label>
              <input
                type="text"
                className="search-input"
                style={{ paddingLeft: '0.85rem' }}
                placeholder="e.g. Blue shirt, black trousers, white sneakers"
                value={clothingDescription}
                onChange={(e) => setClothingDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="input-label">IDENTIFYING FEATURES</label>
              <input
                type="text"
                className="search-input"
                style={{ paddingLeft: '0.85rem' }}
                placeholder="e.g. Small scar above right eyebrow, wearing black backpack"
                value={identifyingFeatures}
                onChange={(e) => setIdentifyingFeatures(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="input-label">ADDITIONAL INFORMATION</label>
              <textarea
                className="public-textarea"
                rows={3}
                placeholder="Last seen location details, direction of travel, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* LOCATION TELEMETRY */}
            <div className="form-group">
              <label className="input-label">LAST SEEN LOCATION TELEMETRY</label>
              <button
                type="button"
                className="location-detect-btn"
                onClick={handleDetectLocation}
                disabled={locationLoading}
              >
                <Navigation size={16} />
                <span>{locationLoading ? 'Detecting GPS...' : '[ USE CURRENT LOCATION ]'}</span>
              </button>

              {locationDetected && (
                <div className="location-success-box">
                  <CheckCircle2 size={16} style={{ color: 'var(--sev-success)' }} />
                  <span>GPS Detected: <strong>{location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E</strong></span>
                </div>
              )}

              {locationError && (
                <div className="location-error-text">
                  <span>{locationError}</span>
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <div className="form-submit-group">
              <button
                type="submit"
                className="submit-report-btn"
                style={{ backgroundColor: 'var(--sev-high)' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span>UPLOADING REPORT...</span>
                ) : (
                  <>
                    <UserSearch size={18} />
                    <span>CREATE MISSING PERSON CASE</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default MissingPerson;
