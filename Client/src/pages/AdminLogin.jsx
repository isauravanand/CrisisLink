import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Siren, Lock, Mail, ShieldAlert, ArrowRight, Loader2, ShieldCheck, Zap } from 'lucide-react';

export const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both admin email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      console.error('[Admin Login Error]:', err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0a0c10',
      padding: '2rem 1.5rem',
      color: '#f8fafc'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '960px',
        backgroundColor: '#12151c',
        border: '1px solid #1e2430',
        borderRadius: '12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        overflow: 'hidden'
      }}>
        
        {/* LEFT PANEL: CRISISLINK BRANDING & MISSION */}
        <div style={{
          background: '#0d0f14',
          borderRight: '1px solid #1e2430',
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '2rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{
                background: '#dc2626',
                color: '#ffffff',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Siren size={20} />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.06em' }}>
                CRISISLINK
              </span>
            </div>

            <div style={{
              background: '#1c1917',
              border: '1px solid #44403c',
              padding: '0.35rem 0.75rem',
              borderRadius: '4px',
              color: '#f97316',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginBottom: '1rem'
            }}>
              <Zap size={13} />
              <span>COMMAND CENTER PORTAL</span>
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.25, margin: '0 0 1rem 0' }}>
              AI-Powered Emergency & Disaster Response
            </h2>

            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
              Connect citizens, responders and AI-powered rescue intelligence when every second matters.
            </p>
          </div>

          <div style={{
            background: '#161a23',
            border: '1px solid #222938',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem'
          }}>
            <ShieldCheck size={18} style={{ color: '#22c55e', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
              Restricted Operational Access. For emergency responders, rescue coordinators, and EOC administrators.
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: ADMIN ACCESS LOGIN FORM */}
        <div style={{ padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.35rem 0' }}>
              ADMIN ACCESS
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
              Enter authorized command credentials to access EOC operations.
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              backgroundColor: '#450a0a',
              border: '1px solid #7f1d1d',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              color: '#fca5a5',
              fontSize: '0.825rem',
              marginBottom: '1.5rem'
            }}>
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: '0.4rem',
                textTransform: 'uppercase'
              }}>
                Responder Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b'
                }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lifeline.local"
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0a0c10',
                    border: '1px solid #1e2430',
                    borderRadius: '6px',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: '0.4rem',
                textTransform: 'uppercase'
              }}>
                Security Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b'
                }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0a0c10',
                    border: '1px solid #1e2430',
                    borderRadius: '6px',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.85rem',
                fontWeight: 700,
                fontSize: '0.875rem',
                letterSpacing: '0.04em',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {isSubmitting ? (
                <span>AUTHENTICATING COMMAND CENTER...</span>
              ) : (
                <>
                  <span>LOGIN TO COMMAND CENTER</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
