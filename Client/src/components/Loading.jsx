import React from 'react';
import { RefreshCw } from 'lucide-react';

export const Loading = ({ message = 'INITIALIZING COMMAND CENTER...' }) => {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-secondary)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <RefreshCw size={24} className="spinning" style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em' }}>{message}</span>
      </div>
    </div>
  );
};

export default Loading;
