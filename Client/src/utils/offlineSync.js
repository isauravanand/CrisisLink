/**
 * CrisisLink Offline Sync & Storage Engine
 * Manages offline emergency storage and automatic background synchronization.
 */

const STORAGE_KEY = 'crisislink_offline_reports';

/**
 * Convert a File object to Base64 Data URL for localStorage persistence
 */
export const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Convert Base64 Data URL back to a File object
 */
export const dataUrlToFile = async (dataUrl, filename = 'offline_upload.jpg') => {
  if (!dataUrl) return null;
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
};

/**
 * Get all queued offline reports from LocalStorage
 */
export const getOfflineReports = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[OfflineSync] Error reading offline reports:', e);
    return [];
  }
};

/**
 * Save report locally when network is offline
 */
export const saveOfflineReport = async (reportData, category = 'EMERGENCY') => {
  try {
    const queue = getOfflineReports();
    const timestamp = Date.now();
    const shortCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const offlineId = `OFFLINE-LF-${timestamp.toString().slice(-4)}-${shortCode}`;

    let photoDataUrl = null;
    let cleanPayload = { ...reportData };

    // If report contains a File instance, convert to Base64
    if (cleanPayload.photo instanceof File) {
      photoDataUrl = await fileToDataUrl(cleanPayload.photo);
      delete cleanPayload.photo;
    }

    const record = {
      offlineId,
      category,
      payload: cleanPayload,
      photoDataUrl,
      savedAt: new Date().toISOString(),
      status: 'PENDING_SYNC'
    };

    queue.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    console.log('[OfflineSync] Report stored locally for auto-sync:', offlineId);
    return record;
  } catch (e) {
    console.error('[OfflineSync] Error saving offline report:', e);
    throw new Error('Unable to store report on local device storage.');
  }
};

/**
 * Remove report from offline queue after successful sync
 */
export const removeOfflineReport = (offlineId) => {
  try {
    const queue = getOfflineReports().filter(item => item.offlineId !== offlineId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('[OfflineSync] Error removing synced report:', e);
  }
};

/**
 * Synchronize all queued offline reports with backend server
 */
export const syncOfflineReports = async (apiServices = {}) => {
  const { createEmergency, createMissingPerson } = apiServices;
  const queue = getOfflineReports();
  if (queue.length === 0) return { syncedCount: 0 };

  let syncedCount = 0;

  for (const record of queue) {
    try {
      const { offlineId, category, payload, photoDataUrl } = record;

      if (category === 'MISSING_PERSON' && createMissingPerson) {
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
          if (typeof payload[key] === 'object') {
            formData.append(key, JSON.stringify(payload[key]));
          } else {
            formData.append(key, payload[key]);
          }
        });

        if (photoDataUrl) {
          const file = await dataUrlToFile(photoDataUrl, 'missing_person.jpg');
          if (file) formData.append('photo', file);
        }

        await createMissingPerson(formData);
      } else if (createEmergency) {
        // EMERGENCY / INJURY REPORT
        let dataToSend = payload;

        if (photoDataUrl) {
          const file = await dataUrlToFile(photoDataUrl, 'injury_photo.jpg');
          const formData = new FormData();
          Object.keys(payload).forEach(key => {
            if (typeof payload[key] === 'object') {
              formData.append(key, JSON.stringify(payload[key]));
            } else {
              formData.append(key, payload[key]);
            }
          });
          if (file) formData.append('photo', file);
          dataToSend = formData;
        }

        await createEmergency(dataToSend);
      }

      removeOfflineReport(offlineId);
      syncedCount++;
    } catch (e) {
      console.error(`[OfflineSync] Sync failed for record ${record.offlineId}:`, e);
    }
  }

  return { syncedCount };
};

export default {
  getOfflineReports,
  saveOfflineReport,
  removeOfflineReport,
  syncOfflineReports,
  fileToDataUrl,
  dataUrlToFile
};
