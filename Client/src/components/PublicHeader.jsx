import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Siren, ShieldAlert, Search, UserSearch, AlertTriangle, Stethoscope, Sparkles, Radio } from 'lucide-react';

export const PublicHeader = () => {
  const location = useLocation();

  return (
    <header style={{
      background: '#111210',
      borderBottom: '1px solid #222520',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      width: '100%',
      textDecoration: 'none'
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '0.75rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap',
        gap: '1.25rem'
      }}>
        {/* BRAND LOGO */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{
            background: '#ef4444',
            color: '#ffffff',
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
          }}>
            <Siren size={18} />
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.06em', textDecoration: 'none' }}>
            LIFELINE
          </span>
          <Sparkles size={13} style={{ color: '#f59e0b', marginLeft: '2px' }} />
        </Link>

        {/* NAVIGATION LINKS */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', whiteSpace: 'nowrap', overflowX: 'auto' }}>
          <Link
            to="/report-injury"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              color: '#ffffff',
              background: location.pathname.includes('injury') ? '#ea580c' : 'rgba(234, 88, 12, 0.15)',
              border: '1px solid #ea580c',
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.82rem',
              transition: 'background-color 0.15s ease'
            }}
          >
            <Stethoscope size={14} style={{ color: location.pathname.includes('injury') ? '#ffffff' : '#f97316' }} />
            <span>Upload Injury & AI Reply</span>
          </Link>

          <Link
            to="/no-zone-area"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              color: location.pathname.includes('no-zone') ? '#ffffff' : '#ef4444',
              background: location.pathname.includes('no-zone') ? '#dc2626' : 'transparent',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.82rem'
            }}
          >
            <AlertTriangle size={14} style={{ color: '#ef4444' }} />
            <span>No Zone Area</span>
          </Link>

          <Link
            to="/report"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: location.pathname === '/report' ? '#ffffff' : '#9b9e94',
              fontWeight: 600,
              fontSize: '0.82rem',
              padding: '0.4rem 0.5rem'
            }}
          >
            <span>Report Emergency</span>
          </Link>

          <Link
            to="/missing-person"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: location.pathname === '/missing-person' ? '#ffffff' : '#9b9e94',
              fontWeight: 600,
              fontSize: '0.82rem',
              padding: '0.4rem 0.5rem'
            }}
          >
            <span>Missing Persons</span>
          </Link>

          <Link
            to="/track-incident"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              color: location.pathname === '/track-incident' ? '#ffffff' : '#9b9e94',
              fontWeight: 600,
              fontSize: '0.82rem',
              padding: '0.4rem 0.5rem'
            }}
          >
            <Search size={13} />
            <span>Track Incident</span>
          </Link>

          <Link
            to="/track-missing-person"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              textDecoration: 'none',
              color: location.pathname === '/track-missing-person' ? '#ffffff' : '#9b9e94',
              fontWeight: 600,
              fontSize: '0.82rem',
              padding: '0.4rem 0.5rem'
            }}
          >
            <UserSearch size={13} />
            <span>Track Missing</span>
          </Link>

          <Link
            to="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              textDecoration: 'none',
              color: '#f1f1ea',
              background: '#151714',
              border: '1px solid #2a2d28',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              marginLeft: '0.5rem'
            }}
          >
            <ShieldAlert size={14} style={{ color: '#38bdf8' }} />
            <span>Command Center</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;
