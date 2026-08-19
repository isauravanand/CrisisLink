import React, { useState, useMemo } from 'react';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';
import { formatDateTime } from '../utils/formatters';
import {
  History,
  Siren,
  Building2,
  UserSearch,
  CheckCircle2,
  Radio,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  Bot
} from 'lucide-react';

export const ActivityLogView = ({ emergencies = [], missingCases = [], onSelectEmergency, onSelectMissingPerson, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Build unified chronological activity events list from all emergencies & missing person cases
  const activityEvents = useMemo(() => {
    const events = [];

    // 1. Process Emergency Events
    emergencies.forEach(e => {
      // Event A: Incident Creation
      events.push({
        id: `evt_create_${e._id}`,
        timestamp: new Date(e.createdAt || Date.now()),
        category: 'EMERGENCY_REPORT',
        title: `EMERGENCY REPORTED: #${e.caseId}`,
        caseId: e.caseId,
        actor: e.aiAnalysis?.aiStatus === 'SUCCESS' ? 'AI Triage Engine' : 'Public Telemetry',
        description: e.description,
        priorityLevel: e.priorityLevel,
        status: e.status,
        emergencyType: e.emergencyType,
        assignedHospital: e.assignedHospital,
        raw: e
      });

      // Event B: Hospital Dispatch / ACT Action (if hospital is assigned)
      if (e.assignedHospital && e.assignedHospital.name) {
        events.push({
          id: `evt_hosp_${e._id}`,
          timestamp: new Date(e.assignedHospital.assignedAt || e.updatedAt || e.createdAt),
          category: 'HOSPITAL_DISPATCH',
          title: `HOSPITAL DISPATCH: ${e.assignedHospital.name}`,
          caseId: e.caseId,
          actor: 'ACT Hospital Evaluator',
          description: e.assignedHospital.aiReasoning || `Routed to ${e.assignedHospital.name} (${e.assignedHospital.distanceKm} km away). Ambulance Unit: ${e.assignedHospital.ambulanceUnit || 'ALS-UNIT-01'}`,
          priorityLevel: e.priorityLevel,
          status: e.status,
          assignedHospital: e.assignedHospital,
          raw: e
        });
      }

      // Event C: Status Transition (if updated)
      if (e.updatedAt && new Date(e.updatedAt).getTime() > new Date(e.createdAt).getTime() + 1000) {
        events.push({
          id: `evt_status_${e._id}`,
          timestamp: new Date(e.updatedAt),
          category: 'STATUS_UPDATE',
          title: `STATUS TRANSITION: ${e.caseId} ➔ ${e.status}`,
          caseId: e.caseId,
          actor: 'Responder Command Center',
          description: `Emergency status updated to '${e.status}'. Criticality Level: ${e.priorityLevel}.`,
          priorityLevel: e.priorityLevel,
          status: e.status,
          raw: e
        });
      }
    });

    // 2. Process Missing Person Events
    missingCases.forEach(m => {
      events.push({
        id: `evt_missing_${m._id}`,
        timestamp: new Date(m.createdAt || Date.now()),
        category: 'MISSING_PERSON',
        title: `MISSING PERSON REPORTED: ${m.name} (${m.caseId})`,
        caseId: m.caseId,
        actor: 'Public Registration',
        description: `Missing person case filed for ${m.name} (${m.age} YRS • ${m.gender}). Last observed area: ${m.lastSeenLocation?.address || 'Delhi Region'}.`,
        status: m.status,
        rawMissing: m
      });
    });

    // Sort descending (newest first)
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [emergencies, missingCases]);

  const filteredEvents = activityEvents.filter(evt => {
    const matchesSearch =
      evt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.actor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === 'ALL' ? true :
      filterType === 'EMERGENCY' ? evt.category === 'EMERGENCY_REPORT' :
      filterType === 'DISPATCH' ? evt.category === 'HOSPITAL_DISPATCH' :
      filterType === 'STATUS' ? evt.category === 'STATUS_UPDATE' :
      filterType === 'MISSING' ? evt.category === 'MISSING_PERSON' : true;

    return matchesSearch && matchesType;
  });

  const getEventCategoryStyle = (category) => {
    switch (category) {
      case 'EMERGENCY_REPORT':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: 'var(--sev-high)', border: 'rgba(239, 68, 68, 0.4)', icon: Siren };
      case 'HOSPITAL_DISPATCH':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: 'var(--sev-success)', border: 'rgba(34, 197, 94, 0.4)', icon: Building2 };
      case 'MISSING_PERSON':
        return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.4)', icon: UserSearch };
      case 'STATUS_UPDATE':
      default:
        return { bg: 'rgba(234, 179, 8, 0.15)', text: 'var(--sev-medium)', border: 'rgba(234, 179, 8, 0.4)', icon: Activity };
    }
  };

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
            <History size={22} style={{ color: 'var(--sev-high)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.04em', margin: 0 }}>
              SYSTEM OPERATIONS & DISPATCH ACTIVITY LOG
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            Audit trail of AI triage evaluations, hospital dispatches, status transitions, and missing person registrations.
          </p>
        </div>

        <button
          onClick={onRefresh}
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
          <span>REFRESH LOGS</span>
        </button>
      </div>

      {/* SEARCH & CATEGORY FILTER BAR */}
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
            placeholder="Search activity by Case ID, description, or actor..."
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
            { id: 'ALL', label: 'ALL EVENTS' },
            { id: 'EMERGENCY', label: 'EMERGENCIES' },
            { id: 'DISPATCH', label: 'HOSPITAL DISPATCHES' },
            { id: 'STATUS', label: 'STATUS TRANSITIONS' },
            { id: 'MISSING', label: 'MISSING PERSONS' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: filterType === f.id ? 'var(--sev-high)' : 'var(--bg-input)',
                color: filterType === f.id ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ACTIVITY FEED LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredEvents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            color: 'var(--text-muted)'
          }}>
            <History size={36} style={{ margin: '0 auto 0.75rem auto', color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>NO ACTIVITY LOGS FOUND</h3>
            <p style={{ fontSize: '0.82rem', margin: '0.25rem 0 0 0' }}>No event records match your current search or filter query.</p>
          </div>
        ) : (
          filteredEvents.map(evt => {
            const style = getEventCategoryStyle(evt.category);
            const Icon = style.icon;

            return (
              <div
                key={evt.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1 }}>
                  {/* ICON NODE */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: style.bg,
                    color: style.text,
                    border: `1px solid ${style.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Icon size={20} />
                  </div>

                  {/* EVENT CONTENT */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {evt.title}
                      </span>
                      {evt.priorityLevel && <PriorityBadge level={evt.priorityLevel} />}
                      {evt.status && <StatusBadge status={evt.status} />}
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                      {evt.description}
                    </p>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginTop: '0.2rem',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} />
                        {formatDateTime(evt.timestamp)}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        <Bot size={12} style={{ color: 'var(--sev-high)' }} />
                        Actor: {evt.actor}
                      </span>
                    </div>
                  </div>
                </div>

                {/* VIEW CASE ACTION BUTTON */}
                {(evt.raw || evt.rawMissing) && (
                  <button
                    onClick={() => {
                      if (evt.raw) onSelectEmergency && onSelectEmergency(evt.raw);
                      if (evt.rawMissing) onSelectMissingPerson && onSelectMissingPerson(evt.rawMissing);
                    }}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      flexShrink: 0,
                      alignSelf: 'center'
                    }}
                  >
                    <span>VIEW CASE</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ActivityLogView;
