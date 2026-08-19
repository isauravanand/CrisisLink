import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getOperationsMap } from '../services/api';
import {
  Compass,
  Siren,
  UserSearch,
  Radio,
  Eye,
  CheckCircle2,
  Filter,
  RotateCw,
  MapPin,
  Clock,
  ChevronRight
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

// Custom SVG Leaflet Markers for Operational Clarity
const createCustomMarkerIcon = (color, labelText) => {
  const isHosp = labelText === 'HOSPITAL';
  const symbolContent = isHosp
    ? `<rect x="11" y="11" width="10" height="10" rx="2" fill="#fff"/><path d="M14 16h4M16 14v4" stroke="${color}" stroke-width="2"/>`
    : `<circle cx="16" cy="16" r="7" fill="#111" /><circle cx="16" cy="16" r="4" fill="${color}" />`;

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 0 C7.16 0 0 7.16 0 16 C0 28 16 42 16 42 C16 42 32 28 32 16 C32 7.16 24.84 0 16 0 Z" fill="${color}" stroke="#111" stroke-width="2"/>
      ${symbolContent}
    </svg>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: svgString,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -36]
  });
};

const MARKER_ICONS = {
  EMERGENCY: createCustomMarkerIcon('#ef4444', 'EMERGENCY'),
  HOSPITAL: createCustomMarkerIcon('#10b981', 'HOSPITAL'),
  MISSING_PERSON: createCustomMarkerIcon('#f97316', 'MISSING_PERSON'),
  DRONE_SEARCH: createCustomMarkerIcon('#06b6d4', 'DRONE_SEARCH'),
  POSSIBLE_MATCH: createCustomMarkerIcon('#eab308', 'POSSIBLE_MATCH'),
  CONFIRMED: createCustomMarkerIcon('#22c55e', 'CONFIRMED')
};

export const OperationsMap = ({ onSelectCase }) => {
  const [points, setPoints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedPointId, setSelectedPointId] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const circlesGroupRef = useRef(null);

  useEffect(() => {
    fetchMapPoints();
  }, []);

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let resizeObserver = null;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([28.6139, 77.2090], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      circlesGroupRef.current = L.layerGroup().addTo(map);
      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);

      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const fetchMapPoints = async () => {
    setIsLoading(true);
    try {
      const res = await getOperationsMap();
      if (res && res.data && res.data.points) {
        setPoints(res.data.points);
      }
    } catch (err) {
      console.error('Failed to load operational map points:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPoints = points.filter((pt) => {
    if (activeFilter === 'ALL') return true;
    return pt.category === activeFilter;
  });

  // Render Leaflet Markers & Red Danger Circles whenever filteredPoints or activeFilter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !circlesGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    circlesGroupRef.current.clearLayers();

    if (filteredPoints.length > 0) {
      const bounds = L.latLngBounds();

      filteredPoints.forEach((pt) => {
        const icon = MARKER_ICONS[pt.pointType] || MARKER_ICONS.EMERGENCY;
        const marker = L.marker([pt.latitude, pt.longitude], { icon });

        // Draw Red Circle Danger Zone around emergency incidents (same as user side)
        if (pt.pointType === 'EMERGENCY') {
          const radius = pt.priorityLevel === 'CRITICAL' ? 1800 : pt.priorityLevel === 'HIGH' ? 1200 : 750;
          const circle = L.circle([pt.latitude, pt.longitude], {
            radius,
            color: '#ef4444',
            weight: 2,
            opacity: 0.85,
            fillColor: '#ef4444',
            fillOpacity: 0.2,
            dashArray: '6, 6'
          });
          circle.bindPopup(`
            <div style="padding:4px; font-family:sans-serif; color:#111;">
              <strong style="color:#ef4444;">RED DANGER ZONE PERIMETER (${(radius/1000).toFixed(1)} km)</strong><br/>
              <span>${pt.title}</span>
            </div>
          `);
          circlesGroupRef.current.addLayer(circle);
        }

        const hospBadge = pt.assignedHospital?.name ? `
          <div style="background:#e6f4ea; border:1px solid #34d399; color:#065f46; padding:4px 6px; border-radius:4px; font-size:10px; font-weight:800; margin-top:4px;">
            🏥 ASSIGNED: ${pt.assignedHospital.name} (${pt.assignedHospital.distanceKm}km)
          </div>
        ` : '';

        const popupContent = `
          <div style="padding: 4px; color: #111; max-width: 230px; font-family: sans-serif;">
            <div style="font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase;">
              ${pt.pointType.replace('_', ' ')} • ${pt.caseId}
            </div>
            <div style="font-size: 14px; font-weight: 800; margin: 4px 0;">
              ${pt.title}
            </div>
            <div style="font-size: 12px; color: #444; margin-bottom: 6px;">
              GPS: <strong>${pt.latitude.toFixed(4)}° N, ${pt.longitude.toFixed(4)}° E</strong>
              ${pt.address ? ` (${pt.address})` : ''}
            </div>
            ${hospBadge}
            ${pt.pointType !== 'HOSPITAL' ? `
              <button id="popup-btn-${pt.id}" style="width: 100%; margin-top:6px; background: #111; color: #fff; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer;">
                VIEW CASE DETAILS
              </button>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          setTimeout(() => {
            const btn = document.getElementById(`popup-btn-${pt.id}`);
            if (btn && onSelectCase) {
              btn.onclick = () => onSelectCase(pt.caseId, pt.pointType);
            }
          }, 50);
        });

        marker.on('click', () => {
          setSelectedPointId(pt.id);
        });

        markersGroupRef.current.addLayer(marker);
        bounds.extend([pt.latitude, pt.longitude]);
      });

      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [filteredPoints, onSelectCase]);

  const handleCenterOnPoint = (pt) => {
    setSelectedPointId(pt.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([pt.latitude, pt.longitude], 14, { duration: 1.2 });
    }
  };

  const counts = {
    ALL: points.length,
    EMERGENCIES: points.filter(p => p.category === 'EMERGENCIES').length,
    HOSPITALS: points.filter(p => p.category === 'HOSPITALS').length,
    MISSING_PERSONS: points.filter(p => p.category === 'MISSING_PERSONS').length,
    DRONE_SEARCHES: points.filter(p => p.category === 'DRONE_SEARCHES').length,
    POSSIBLE_MATCHES: points.filter(p => p.category === 'POSSIBLE_MATCHES').length,
    CONFIRMED: points.filter(p => p.category === 'CONFIRMED').length
  };

  return (
    <div className="operations-map-page" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'calc(100vh - 120px)' }}>
      {/* MAP PAGE HEADER & FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '0.85rem 1.15rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Compass size={22} style={{ color: 'var(--sev-high)' }} />
          <div>
            <h1 className="page-title" style={{ fontSize: '1.25rem', marginBottom: 0 }}>SEARCH OPERATIONS MAP</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Real-time operational GIS telemetry: Incident locations, missing person last known positions, drone search grids & candidate sightings.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="drawer-close-btn"
            title="Refresh Map Points"
            onClick={fetchMapPoints}
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* FILTER BUTTONS ROW */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: 'ALL OPERATIONAL POINTS' },
          { id: 'EMERGENCIES', label: 'EMERGENCIES', color: '#ef4444' },
          { id: 'HOSPITALS', label: 'HOSPITALS & TRAUMA', color: '#10b981' },
          { id: 'MISSING_PERSONS', label: 'MISSING PERSONS', color: '#f97316' },
          { id: 'DRONE_SEARCHES', label: 'DRONE FOOTAGE', color: '#06b6d4' },
          { id: 'POSSIBLE_MATCHES', label: 'POSSIBLE SIGHTINGS', color: '#eab308' },
          { id: 'CONFIRMED', label: 'CONFIRMED SIGHTINGS', color: '#22c55e' }
        ].map((btn) => {
          const isActive = activeFilter === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => setActiveFilter(btn.id)}
              style={{
                background: isActive ? 'var(--bg-input)' : 'var(--bg-elevated)',
                border: isActive ? `1px solid ${btn.color || 'var(--sev-high)'}` : '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: isActive ? (btn.color || 'var(--text-primary)') : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer'
              }}
            >
              {btn.color && (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: btn.color }}></span>
              )}
              <span>{btn.label}</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', color: 'var(--text-muted)' }}>
                {counts[btn.id] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* MAIN MAP & SIDEBAR GRID */}
      <div className="operations-map-grid">
        {/* LEFT: LEAFLET MAP CANVAS CONTAINER */}
        <div className="operations-map-canvas-box" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#111' }} />
        </div>


        {/* RIGHT: OPERATIONAL TELEMETRY & MARKERS LIST */}
        <div className="public-form-card" style={{ maxWidth: '100%', padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>OPERATIONAL LOCATIONS ({filteredPoints.length})</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>GPS Verified</span>
          </div>

          {isLoading ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              Loading operational map points...
            </div>
          ) : filteredPoints.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No GPS coordinates found for selected filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredPoints.map((pt) => {
                const isSelected = selectedPointId === pt.id;
                return (
                  <div
                    key={pt.id}
                    style={{
                      background: isSelected ? 'var(--bg-input)' : 'var(--bg-elevated)',
                      border: isSelected ? '1px solid var(--sev-high)' : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.65rem 0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => handleCenterOnPoint(pt)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                        {pt.title}
                      </span>
                      <span className="type-pill" style={{ fontSize: '0.6rem' }}>
                        {pt.caseId}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={12} />
                      <span>{pt.latitude.toFixed(4)}° N, {pt.longitude.toFixed(4)}° E</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      <span>{formatDateTime(pt.createdAt)}</span>
                      {onSelectCase && (
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--sev-high)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCase(pt.caseId, pt.pointType);
                          }}
                        >
                          VIEW CASE &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperationsMap;
