import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Siren,
  UserSearch,
  Radio,
  Compass,
  AlertTriangle,
  Settings,
  LogOut,
  Building2,
  PackageCheck,
  Search,
  Activity,
  History
} from 'lucide-react';

export const Sidebar = ({ activeTab = 'overview', onTabSelect }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const navItems = [
    { id: 'overview', label: 'Command Center', icon: LayoutDashboard },
    { id: 'emergencies', label: 'Emergencies', icon: Siren },
    { id: 'map', label: 'Live Map', icon: Compass },
    { id: 'missing', label: 'Missing Persons', icon: UserSearch },
    { id: 'drone', label: 'Live Search', icon: Radio },
    { id: 'no-zone', label: 'No Zone & Supplies', icon: AlertTriangle },
    { id: 'hospitals', label: 'Hospitals', icon: Building2 },
    { id: 'activity', label: 'Activity Log', icon: History }
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-mark" style={{ background: '#dc2626', color: '#fff' }}>
              <Siren size={18} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="brand-title" style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.06em' }}>CRISISLINK</span>
              <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>COMMAND CENTER</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">MAIN NAVIGATION</span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onTabSelect(item.id)}
              >
                <Icon size={16} className="nav-icon" />
                <span>{item.label}</span>
                {item.badge && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    background: 'var(--bg-input)',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                    color: 'var(--text-muted)'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="nav-divider" />

          <span className="nav-section-label">SYSTEM</span>
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => onTabSelect('settings')}
          >
            <Settings size={16} className="nav-icon" />
            <span>SETTINGS</span>
          </button>

          <button
            className="nav-item"
            style={{ color: 'var(--sev-critical)' }}
            onClick={handleLogout}
            title="Sign out of Responder Command Center"
          >
            <LogOut size={16} className="nav-icon" />
            <span>LOGOUT</span>
          </button>
        </nav>
      </div>

      <div className="sidebar-footer">
        {user && (
          <div style={{
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--border-color)',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>ADMIN: </span>
            {user.email}
          </div>
        )}
        <div className="system-status-indicator">
          <span className="status-label">SYSTEM STATUS</span>
          <div className="status-badge-inline">
            <span className="dot-pulse"></span>
            <span>OPERATIONAL</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
