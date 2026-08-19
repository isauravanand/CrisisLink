import React from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/PublicHeader';
import {
  Siren,
  AlertTriangle,
  Stethoscope,
  UserSearch,
  ShieldCheck,
  Building2,
  Activity,
  Bot
} from 'lucide-react';

export const Landing = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#0e0f0d', color: '#f1f1ea' }}>
      <PublicHeader />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* CENTERED HERO COMMAND CARD MATCHING SCREENSHOT */}
        <div style={{
          width: '100%',
          maxWidth: '580px',
          background: '#151714',
          border: '1px solid #2a2d28',
          borderRadius: '12px',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1.25rem',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)'
        }}>
          
          {/* BADGE */}
          <div style={{
            background: '#1f221e',
            border: '1px solid #2a2d28',
            borderRadius: '20px',
            padding: '0.35rem 0.85rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#9b9e94',
            letterSpacing: '0.06em'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            <span>EMERGENCY INCIDENT RESPONSE SYSTEM</span>
          </div>

          {/* MAIN TITLE */}
          <h1 style={{
            fontSize: '2.75rem',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '0.08em',
            margin: '0.2rem 0 0 0',
            lineHeight: 1
          }}>
            LIFELINE
          </h1>

          {/* TAGLINE */}
          <p style={{
            fontSize: '1.05rem',
            color: '#9b9e94',
            fontWeight: 500,
            margin: 0,
            lineHeight: 1.4
          }}>
            Emergency response, when every second matters.
          </p>

          {/* ACTION BUTTONS STACK */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.75rem' }}>
            
            {/* BUTTON 1: UPLOAD INJURY & AUTOMATE AI REPLY */}
            <Link
              to="/report-injury"
              style={{
                textDecoration: 'none',
                background: '#f97316',
                color: '#ffffff',
                width: '100%',
                padding: '0.95rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 16px rgba(249, 115, 22, 0.35)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Stethoscope size={18} />
              <span>UPLOAD INJURY & AUTOMATE AI REPLY</span>
            </Link>

            {/* BUTTON 2: REPORT EMERGENCY INCIDENT */}
            <Link
              to="/report"
              style={{
                textDecoration: 'none',
                background: '#1f221e',
                border: '1px solid #2a2d28',
                color: '#ffffff',
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <Siren size={16} />
              <span>REPORT EMERGENCY INCIDENT</span>
            </Link>

            {/* BUTTON 3: VIEW NO ZONE AREA & RELIEF SUPPLIES MAP */}
            <Link
              to="/no-zone-area"
              style={{
                textDecoration: 'none',
                background: '#1f221e',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <AlertTriangle size={16} style={{ color: '#ef4444' }} />
              <span>VIEW NO ZONE AREA & RELIEF SUPPLIES MAP</span>
            </Link>

            {/* BUTTON 4: FIND A MISSING PERSON */}
            <Link
              to="/missing-person"
              style={{
                textDecoration: 'none',
                background: '#1f221e',
                border: '1px solid #2a2d28',
                color: '#ffffff',
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <UserSearch size={16} />
              <span>FIND A MISSING PERSON</span>
            </Link>

          </div>

          {/* BOTTOM EXPLANATION BOX */}
          <div style={{
            background: '#1b1d1a',
            border: '1px solid #2a2d28',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            marginTop: '0.5rem'
          }}>
            <ShieldCheck size={16} style={{ color: '#9b9e94', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: '#9b9e94', lineHeight: 1.45 }}>
              LifeLine uses automated incident analysis to help emergency responders understand, triage, and prioritize critical reports.
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default Landing;
