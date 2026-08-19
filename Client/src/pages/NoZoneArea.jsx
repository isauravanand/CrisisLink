import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getNoZoneData } from '../services/api';
import { PublicHeader } from '../components/PublicHeader';
import {
  ShieldAlert,
  AlertTriangle,
  PackageCheck,
  Navigation,
  MapPin,
  RotateCw,
  PhoneCall,
  ExternalLink,
  Layers,
  Radio,
  Clock,
  Info
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

// Custom SVG Leaflet Icons for Emergencies, Danger Zones & Supply Hubs
const createCustomMarkerIcon = (color, type) => {
  const symbolSvg = type === 'SUPPLY' ? `
    <rect x="8" y="8" width="16" height="16" rx="3" fill="#ffffff"/>
    <path d="M12 16h8M16 12v8" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
  ` : `
    <polygon points="16,6 26,24 6,24" fill="#ffffff" stroke="${color}" stroke-width="2"/>
    <circle cx="16" cy="18" r="2.5" fill="${color}"/>
  `;

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
      <path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 46 18 46 C18 46 36 31.5 36 18 C36 8.06 27.94 0 18 0 Z" fill="${color}" stroke="#111111" stroke-width="2.5"/>
      ${symbolSvg}
    </svg>
  `;

  return L.divIcon({
    className: 'custom-nozone-marker',
    html: svgString,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -40]
  });
};

const MARKER_ICONS = {
  EMERGENCY_CRITICAL: createCustomMarkerIcon('#ef4444', 'EMERGENCY'),
  EMERGENCY_HIGH: createCustomMarkerIcon('#f97316', 'EMERGENCY'),
  EMERGENCY_MEDIUM: createCustomMarkerIcon('#f59e0b', 'EMERGENCY'),
  SUPPLY: createCustomMarkerIcon('#10b981', 'SUPPLY')
};

export const NoZoneArea = ({ isEmbedded = false }) => {
  const [telemetry, setTelemetry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL', 'DANGER_ZONES', 'SUPPLIES'
  const [selectedItemId, setSelectedItemId] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const circlesGroupRef = useRef(null);

  useEffect(() => {
    fetchNoZoneTelemetry();
  }, []);

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let resizeObserver = null;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true
      }).setView([28.6139, 77.2090], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      circlesGroupRef.current = L.layerGroup().addTo(map);
      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Force Leaflet to recalculate container size on load
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);

      // Listen for container resize events to prevent grey blank box
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

  const fetchNoZoneTelemetry = async () => {
    setIsLoading(true);
    try {
      const res = await getNoZoneData();
      if (res && res.data) {
        setTelemetry(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch No Zone Area telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Render Red Danger Circles & Markers whenever telemetry or filter changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !circlesGroupRef.current || !telemetry) return;

    markersGroupRef.current.clearLayers();
    circlesGroupRef.current.clearLayers();

    const bounds = L.latLngBounds();
    let hasPoints = false;

    // 1. Render Danger Zone Red Circles & Emergency Markers
    if (activeFilter === 'ALL' || activeFilter === 'DANGER_ZONES') {
      const dangerZones = telemetry.dangerZones || [];
      const emergencies = telemetry.emergencies || [];

      dangerZones.forEach((zone) => {
        hasPoints = true;
        bounds.extend([zone.latitude, zone.longitude]);

        // Draw RED CIRCLE danger zone
        const circle = L.circle([zone.latitude, zone.longitude], {
          radius: zone.radiusMeters || 1000,
          color: '#ef4444',
          weight: 2.5,
          opacity: 0.85,
          fillColor: '#ef4444',
          fillOpacity: 0.22,
          dashArray: '6, 6'
        });

        const circlePopup = `
          <div style="padding: 6px; font-family: sans-serif; max-width: 240px; color: #111;">
            <div style="background: #ef4444; color: #fff; padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase;">
              NO ZONE AREA • RED DANGER CIRCLE (${zone.radiusKm} km)
            </div>
            <div style="font-size: 13px; font-weight: 800; margin: 6px 0 2px 0; color: #dc2626;">
              ${zone.title}
            </div>
            <div style="font-size: 11px; color: #444; margin-bottom: 6px;">
              ${zone.description}
            </div>
            <div style="font-size: 10px; color: #666; font-family: monospace;">
              GPS: ${zone.latitude.toFixed(4)}° N, ${zone.longitude.toFixed(4)}° E
            </div>
          </div>
        `;
        circle.bindPopup(circlePopup);
        circlesGroupRef.current.addLayer(circle);

        // Emergency Icon Marker at Center
        const iconKey = zone.priorityLevel === 'CRITICAL' ? 'EMERGENCY_CRITICAL' : zone.priorityLevel === 'HIGH' ? 'EMERGENCY_HIGH' : 'EMERGENCY_MEDIUM';
        const icon = MARKER_ICONS[iconKey] || MARKER_ICONS.EMERGENCY_HIGH;
        const marker = L.marker([zone.latitude, zone.longitude], { icon });

        const markerPopup = `
          <div style="padding: 6px; font-family: sans-serif; max-width: 240px; color: #111;">
            <div style="font-size: 10px; font-weight: 800; color: #ef4444; text-transform: uppercase;">
              INCIDENT HAZARD • ${zone.caseId}
            </div>
            <div style="font-size: 13px; font-weight: 800; margin: 4px 0;">
              ${zone.title}
            </div>
            <div style="font-size: 11px; color: #333; margin-bottom: 6px;">
              ${zone.address}
            </div>
            <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); padding: 4px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #b91c1c;">
              HAZARD RADIUS: ${zone.radiusKm} KM (RED CIRCLE)
            </div>
          </div>
        `;
        marker.bindPopup(markerPopup);
        marker.on('click', () => setSelectedItemId(zone.id));
        markersGroupRef.current.addLayer(marker);
      });
    }

    // 2. Render Relief Supply Depot Markers & Google Maps Directions
    if (activeFilter === 'ALL' || activeFilter === 'SUPPLIES') {
      const supplies = telemetry.supplies || [];

      supplies.forEach((hub) => {
        hasPoints = true;
        bounds.extend([hub.latitude, hub.longitude]);

        const icon = MARKER_ICONS.SUPPLY;
        const marker = L.marker([hub.latitude, hub.longitude], { icon });

        const suppliesListHtml = hub.supplies.map(s => `<span style="display:inline-block; background:#e6f4ea; color:#137333; padding:2px 5px; border-radius:3px; font-size:9px; font-weight:700; margin:2px 2px 0 0;">${s}</span>`).join('');

        const popupContent = `
          <div style="padding: 6px; font-family: sans-serif; max-width: 250px; color: #111;">
            <div style="font-size: 10px; font-weight: 800; color: #059669; text-transform: uppercase; display: flex; align-items: center; justify-content: space-between;">
              <span>RELIEF SUPPLY HUB</span>
              <span style="background:#059669; color:#fff; padding:1px 4px; border-radius:3px; font-size:9px;">${hub.status}</span>
            </div>
            <div style="font-size: 13px; font-weight: 800; margin: 4px 0; color: #065f46;">
              ${hub.name}
            </div>
            <div style="font-size: 11px; color: #444; margin-bottom: 6px;">
              ${hub.address}
            </div>
            <div style="margin-bottom: 8px;">
              ${suppliesListHtml}
            </div>
            <a href="${hub.googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; background: #059669; color: #ffffff; text-align: center; text-decoration: none; padding: 7px; border-radius: 5px; font-size: 11px; font-weight: 800; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
              🗺️ OPEN IN GOOGLE MAPS FOR DIRECTIONS &rarr;
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => setSelectedItemId(hub.id));
        markersGroupRef.current.addLayer(marker);
      });
    }

    if (hasPoints) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);
  }, [telemetry, activeFilter]);

  const handleCenterOnLocation = (lat, lng, id) => {
    setSelectedItemId(id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1.2 });
    }
  };

  const dangerZonesList = telemetry?.dangerZones || [];
  const suppliesList = telemetry?.supplies || [];

  const mainContent = (
    <div className="no-zone-container" style={{ padding: isEmbedded ? 0 : '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: isEmbedded ? '100%' : 'calc(100vh - 80px)' }}>
      
      {/* SCREEN HEADER & TELEMETRY STRIP */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--sev-critical-border)', padding: '0.6rem', borderRadius: '8px', color: 'var(--sev-critical)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 className="page-title" style={{ fontSize: '1.35rem', margin: 0, letterSpacing: '0.05em' }}>NO ZONE AREA</h1>
              <span className="type-pill" style={{ background: 'var(--sev-critical-bg)', color: 'var(--sev-critical)', borderColor: 'var(--sev-critical-border)', fontSize: '0.65rem' }}>
                RED DANGER PERIMETERS
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Live Emergency Hazard Map: Red circles demark no-entry danger zones around emergencies. Relief supply hubs list directions to Google Maps.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveFilter('ALL')}
            style={{
              background: activeFilter === 'ALL' ? 'var(--bg-input)' : 'var(--bg-elevated)',
              border: activeFilter === 'ALL' ? '1px solid var(--text-primary)' : '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ALL TELEM ({dangerZonesList.length + suppliesList.length})
          </button>

          <button
            onClick={() => setActiveFilter('DANGER_ZONES')}
            style={{
              background: activeFilter === 'DANGER_ZONES' ? 'var(--sev-critical-bg)' : 'var(--bg-elevated)',
              border: activeFilter === 'DANGER_ZONES' ? '1px solid var(--sev-critical)' : '1px solid var(--border-color)',
              color: activeFilter === 'DANGER_ZONES' ? 'var(--sev-critical)' : 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer'
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></span>
            RED DANGER ZONES ({dangerZonesList.length})
          </button>

          <button
            onClick={() => setActiveFilter('SUPPLIES')}
            style={{
              background: activeFilter === 'SUPPLIES' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-elevated)',
              border: activeFilter === 'SUPPLIES' ? '1px solid #10b981' : '1px solid var(--border-color)',
              color: activeFilter === 'SUPPLIES' ? '#10b981' : 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer'
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
            RELIEF SUPPLIES ({suppliesList.length})
          </button>

          <button
            className="drawer-close-btn"
            title="Refresh No Zone Telemetry"
            onClick={fetchNoZoneTelemetry}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.45rem' }}
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* MAIN DUAL SPLIT GRID: LEAFLET MAP + SUPPLIES / DANGER LIST */}
      <div className="no-zone-map-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', flex: 1, minHeight: 0 }}>
        
        {/* LEFT: LEAFLET MAP CANVAS CONTAINER */}
        <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', background: '#111' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '480px' }} />
          
          {/* MAP LEGEND OVERLAY */}
          <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000, background: 'rgba(15, 17, 14, 0.92)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', pointerEvents: 'auto' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>NO ZONE AREA MAP LEGEND</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#fca5a5' }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px dashed #ef4444', background: 'rgba(239,68,68,0.3)', display: 'inline-block' }}></span>
              <span>Red Danger Circle (No Entry Hazard Zone)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#34d399' }}>
              <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#10b981', display: 'inline-block' }}></span>
              <span>Disaster Relief Supply Center</span>
            </div>
          </div>
        </div>

        {/* RIGHT: RELIEF SUPPLIES & DANGER ZONES DIRECTORY */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* SUPPLIES SECTION HEADER */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PackageCheck size={18} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>DISASTER SUPPLIES ({suppliesList.length})</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#34d399', background: 'rgba(16,185,129,0.12)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                TAP FOR GOOGLE MAPS
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Click any supply hub to open directions directly in Google Maps.
            </p>
          </div>

          {/* SUPPLIES LIST ITEMS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isLoading ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                Loading supplies & telemetry...
              </div>
            ) : suppliesList.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                No supply centers registered.
              </div>
            ) : (
              suppliesList.map((sup) => {
                const isSelected = selectedItemId === sup.id;
                return (
                  <div
                    key={sup.id}
                    style={{
                      background: isSelected ? 'var(--bg-input)' : 'var(--bg-elevated)',
                      border: isSelected ? '1px solid #10b981' : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleCenterOnLocation(sup.latitude, sup.longitude, sup.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                          {sup.name}
                        </h4>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                          <MapPin size={11} style={{ color: '#10b981' }} /> {sup.address}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.15rem 0.4rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        {sup.status}
                      </span>
                    </div>

                    {/* SUPPLIES PILLS */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {sup.supplies.map((item, idx) => (
                        <span key={idx} style={{ fontSize: '0.62rem', fontWeight: 600, background: 'var(--bg-input)', color: 'var(--text-secondary)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          • {item}
                        </span>
                      ))}
                    </div>

                    {/* GOOGLE MAPS DIRECTION BUTTON */}
                    <a
                      href={sup.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        gap: '0.4rem',
                        background: '#059669',
                        color: '#ffffff',
                        textDecoration: 'none',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        marginTop: '0.25rem',
                        transition: 'background-color 0.15s ease'
                      }}
                      className="google-maps-btn"
                    >
                      <Navigation size={13} />
                      <span>OPEN IN GOOGLE MAPS FOR DIRECTIONS</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                );
              })
            )}
          </div>

          {/* DANGER ZONES SECTION HEADER */}
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem', marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={18} style={{ color: 'var(--sev-critical)' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>RED DANGER ZONES ({dangerZonesList.length})</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              High hazard perimeters mapped as red circles around active emergency incidents.
            </p>
          </div>

          {/* DANGER ZONES LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {dangerZonesList.map((dz) => (
              <div
                key={dz.id}
                style={{
                  background: 'var(--sev-critical-bg)',
                  border: '1px solid var(--sev-critical-border)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  cursor: 'pointer'
                }}
                onClick={() => handleCenterOnLocation(dz.latitude, dz.longitude, dz.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fca5a5' }}>{dz.title}</span>
                  <span className="type-pill" style={{ fontSize: '0.6rem', background: 'var(--sev-critical)', color: '#fff', border: 'none' }}>
                    {dz.caseId}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {dz.description}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#f87171', fontWeight: 700, marginTop: '0.15rem' }}>
                  <span>RADIUS: {dz.radiusKm} KM (RED CIRCLE)</span>
                  <span>{dz.riskLevel}</span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );

  if (isEmbedded) {
    return mainContent;
  }

  return (
    <div className="public-page-layout">
      <PublicHeader />
      <main style={{ flex: 1, minHeight: 0 }}>
        {mainContent}
      </main>
    </div>
  );
};

export default NoZoneArea;
