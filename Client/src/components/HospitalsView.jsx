import React, { useState, useEffect } from 'react';
import { getHospitals } from '../services/api';
import { Loading } from './Loading';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';
import {
  Building2,
  Phone,
  MapPin,
  Ambulance,
  Activity,
  Bed,
  ShieldCheck,
  Search,
  ExternalLink,
  Siren,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

export const HospitalsView = ({ emergencies = [], onSelectEmergency }) => {
  const [hospitals, setHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [error, setError] = useState(null);

  const fetchHospitalsList = async () => {
    setIsLoading(true);
    try {
      const response = await getHospitals();
      if (response && response.data && response.data.hospitals) {
        setHospitals(response.data.hospitals);
        setError(null);
      } else {
        throw new Error('Failed to retrieve hospitals registry.');
      }
    } catch (err) {
      console.error('[HospitalsView Error]:', err);
      setError(err.message || 'Unable to fetch hospitals data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalsList();
  }, []);

  const totalIcuBeds = hospitals.reduce((acc, h) => acc + (h.icuBedsAvailable || 0), 0);
  const level1Count = hospitals.filter(h => h.traumaTier === 1).length;

  const filteredHospitals = hospitals.filter(h => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.specialties && h.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesTier =
      selectedTier === 'ALL' ? true :
      selectedTier === 'LEVEL_1' ? h.traumaTier === 1 :
      selectedTier === 'LEVEL_2' ? h.traumaTier === 2 :
      selectedTier === 'LEVEL_3' ? h.traumaTier === 3 : true;

    return matchesSearch && matchesTier;
  });

  if (isLoading) {
    return <Loading message="LOADING REGIONAL HOSPITALS & TRAUMA DIRECTORY..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* HEADER BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={22} style={{ color: 'var(--sev-high)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.04em', margin: 0 }}>
              REGIONAL HOSPITALS & TRAUMA CENTERS
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            Real-time medical facility capacity, trauma tier classification, and assigned emergency dispatches.
          </p>
        </div>

        <button
          onClick={fetchHospitalsList}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.45rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} />
          <span>REFRESH DIRECTORY</span>
        </button>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>REGISTERED HOSPITALS</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {hospitals.length}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Operational trauma network</span>
        </div>

        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--sev-high)', letterSpacing: '0.05em' }}>LEVEL 1 APEX CENTERS</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--sev-high)', fontFamily: 'var(--font-mono)' }}>
            {level1Count}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Major burn & multi-trauma hubs</span>
        </div>

        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--sev-success)', letterSpacing: '0.05em' }}>AVAILABLE ICU BEDS</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--sev-success)', fontFamily: 'var(--font-mono)' }}>
            {totalIcuBeds}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Immediate critical bed telemetry</span>
        </div>
      </div>

      {/* SEARCH & TIER FILTER BAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '0.85rem 1.1rem'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search hospitals by name, address, or medical specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem 0.55rem 2.25rem',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'ALL TIERS' },
            { id: 'LEVEL_1', label: 'LEVEL 1 APEX' },
            { id: 'LEVEL_2', label: 'LEVEL 2 EMERGENCY' },
            { id: 'LEVEL_3', label: 'LEVEL 3 URGENT CARE' }
          ].map(tier => (
            <button
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: selectedTier === tier.id ? 'var(--sev-high)' : 'var(--bg-input)',
                color: selectedTier === tier.id ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* HOSPITALS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '1.25rem'
      }}>
        {filteredHospitals.map(hosp => {
          // Find incidents assigned to this hospital
          const assignedIncidents = emergencies.filter(e =>
            e.assignedHospital && e.assignedHospital.name === hosp.name
          );

          return (
            <div
              key={hosp.id}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}
            >
              {/* TOP CARD BAR */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: hosp.traumaTier === 1 ? 'var(--sev-high)' : 'var(--sev-medium)',
                    fontFamily: 'var(--font-mono)',
                    textTransform: 'uppercase'
                  }}>
                    {hosp.traumaLevel}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0 0 0' }}>
                    {hosp.name}
                  </h3>
                </div>

                <span style={{
                  padding: '0.25rem 0.55rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  color: 'var(--sev-success)',
                  border: '1px solid var(--sev-success)',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <Bed size={12} />
                  <span>{hosp.icuBedsAvailable} ICU BEDS</span>
                </span>
              </div>

              {/* ADDRESS & TELEMETRY */}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span>{hosp.address}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                  <a
                    href={`tel:${hosp.contactPhone}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--sev-high)', textDecoration: 'none', fontWeight: 700 }}
                  >
                    <Phone size={13} />
                    <span>{hosp.contactPhone}</span>
                  </a>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                    <Ambulance size={13} />
                    <span>Unit: <strong style={{ color: 'var(--text-primary)' }}>{hosp.ambulanceUnit}</strong></span>
                  </div>
                </div>
              </div>

              {/* SPECIALTIES TAGS */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {hosp.specialties && hosp.specialties.map((spec, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}
                  >
                    {spec}
                  </span>
                ))}
              </div>

              {/* ASSIGNED INCIDENTS LIST */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginTop: '0.2rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    ASSIGNED ACTIVE DISPATCHES ({assignedIncidents.length})
                  </span>
                </div>

                {assignedIncidents.length === 0 ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No active emergency incidents currently routed to this hospital.
                  </span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {assignedIncidents.map(inc => (
                      <div
                        key={inc._id}
                        onClick={() => onSelectEmergency && onSelectEmergency(inc)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          padding: '0.45rem 0.65rem',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                            {inc.caseId}
                          </span>
                          <PriorityBadge level={inc.priorityLevel} />
                        </div>
                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTION LINKS */}
              <a
                href={hosp.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${hosp.latitude},${hosp.longitude}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  marginTop: 'auto'
                }}
              >
                <ExternalLink size={14} />
                <span>OPEN NAVIGATION MAP</span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HospitalsView;
