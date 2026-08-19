import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getOfflineReports, syncOfflineReports } from '../utils/offlineSync';
import { createEmergency, createMissingPerson } from '../services/api';

export const OfflineBanner = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState(null);

  const checkQueue = () => {
    const queue = getOfflineReports();
    setOfflineCount(queue.length);
  };

  const attemptSync = async () => {
    const queue = getOfflineReports();
    if (queue.length > 0 && navigator.onLine) {
      setIsSyncing(true);
      const { syncedCount } = await syncOfflineReports({ createEmergency, createMissingPerson });
      setIsSyncing(false);
      checkQueue();
      if (syncedCount > 0) {
        setSyncSuccessMsg(`✓ ${syncedCount} OFFLINE EMERGENCY REPORT(S) SYNCED AUTOMATICALLY TO ADMIN`);
        setTimeout(() => setSyncSuccessMsg(null), 5000);
      }
    }
  };

  useEffect(() => {
    checkQueue();

    // Sync immediately on load if online and queued items exist
    if (navigator.onLine) {
      attemptSync();
    }

    const handleOnline = async () => {
      setIsOnline(true);
      checkQueue();
      attemptSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !syncSuccessMsg && offlineCount === 0) {
    return null;
  }

  return (
    <div style={{
      width: '100%',
      zIndex: 999999
    }}>
      {!isOnline && (
        <div style={{
          background: '#78350f',
          color: '#fef3c7',
          borderBottom: '1px solid #92400e',
          padding: '0.45rem 1.25rem',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
            <span>● OFFLINE MODE</span>
            <span style={{ opacity: 0.6 }}>|</span>
            <span>Emergency reports are stored safely on your device and will auto-sync when connection returns.</span>
          </div>

          {offlineCount > 0 && (
            <span style={{ background: '#92400e', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontFamily: 'monospace' }}>
              {offlineCount} PENDING SYNC
            </span>
          )}
        </div>
      )}

      {syncSuccessMsg && (
        <div style={{
          background: '#14532d',
          color: '#dcfce7',
          borderBottom: '1px solid #166534',
          padding: '0.5rem 1.25rem',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} style={{ color: '#4ade80' }} />
          <span>{syncSuccessMsg}</span>
        </div>
      )}
    </div>
  );
};

export default OfflineBanner;
