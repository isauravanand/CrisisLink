import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { CriticalAlertStrip } from '../components/CriticalAlertStrip';
import { StatCard } from '../components/StatCard';
import { FilterBar } from '../components/FilterBar';
import { EmergencyList } from '../components/EmergencyList';
import { EmergencyDetails } from '../components/EmergencyDetails';
import { MissingPersonDetails } from './MissingPersonDetails';
import { DroneIntelligence } from './DroneIntelligence';
import { OperationsMap } from './OperationsMap';
import { NoZoneArea } from './NoZoneArea';
import { HospitalsView } from '../components/HospitalsView';
import { ActivityLogView } from '../components/ActivityLogView';
import { ActHospitalModal } from '../components/ActHospitalModal';
import { Loading } from '../components/Loading';

import {
  getEmergencies,
  getActiveEmergencies,
  getEmergencyStats,
  updateEmergencyStatus,
  getMissingPersons,
  updateMissingPersonStatus
} from '../services/api';
import { AlertCircle, UserSearch, Calendar, MapPin } from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

const POLLING_INTERVAL_MS = 15000; // 15 seconds auto polling

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Emergency State
  const [stats, setStats] = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });

  // ACT Action State (AI Hospital Assignment Modal)
  const [actEmergency, setActEmergency] = useState(null);

  // Missing Persons State
  const [missingCases, setMissingCases] = useState([]);
  const [missingPagination, setMissingPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
  const [selectedMissingPerson, setSelectedMissingPerson] = useState(null);
  const [isUpdatingMissingStatus, setIsUpdatingMissingStatus] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: '', priority: '', emergencyType: '' });
  const [sortOption, setSortOption] = useState('priority-desc');
  const [activeOnly, setActiveOnly] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Emergency Drawer State
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const pollingRef = useRef(null);

  const getSortParams = (option) => {
    switch (option) {
      case 'createdAt-desc':
        return { sort: 'createdAt', order: 'desc' };
      case 'createdAt-asc':
        return { sort: 'createdAt', order: 'asc' };
      case 'priority-desc':
      default:
        return { sort: 'priority', order: 'desc' };
    }
  };

  /**
   * Main data fetching handler
   */
  const fetchData = useCallback(async (isSilentRefresh = false) => {
    if (!isSilentRefresh) {
      setIsRefreshing(true);
    }

    try {
      const { sort, order } = getSortParams(sortOption);

      const queryParams = {
        page: currentPage,
        limit: 20,
        sort,
        order,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.emergencyType && { emergencyType: filters.emergencyType })
      };

      const [statsRes, emergenciesRes, missingRes] = await Promise.all([
        getEmergencyStats(),
        activeOnly && !filters.status
          ? getActiveEmergencies(queryParams)
          : getEmergencies(queryParams),
        getMissingPersons({ page: 1, limit: 20 })
      ]);

      if (statsRes?.data) {
        setStats(statsRes.data);
      }

      if (emergenciesRes?.data) {
        setEmergencies(emergenciesRes.data.emergencies || []);
        setPagination(emergenciesRes.data.pagination || { page: 1, totalPages: 1, total: 0, limit: 20 });
      }

      if (missingRes?.data) {
        setMissingCases(missingRes.data.cases || []);
        setMissingPagination(missingRes.data.pagination || { page: 1, totalPages: 1, total: 0, limit: 20 });
      }

      setError(null);
    } catch (err) {
      console.error('[Dashboard Fetch Error]:', err);
      setError(err.message || 'SYSTEM CONNECTION LOST - Unable to reach LifeLine response server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, filters, sortOption, activeOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling mechanism (15s)
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      fetchData(true);
    }, POLLING_INTERVAL_MS);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchData]);

  // Local text search filter applied on top of server dataset
  const filteredEmergencies = emergencies.filter((item) => {
    if (!searchTerm || searchTerm.trim() === '') return true;
    const term = searchTerm.toLowerCase();
    const descMatch = item.description ? item.description.toLowerCase().includes(term) : false;
    const typeMatch = item.emergencyType ? item.emergencyType.toLowerCase().includes(term) : false;
    const addrMatch = item.location && item.location.address ? item.location.address.toLowerCase().includes(term) : false;
    return descMatch || typeMatch || addrMatch;
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({ status: '', priority: '', emergencyType: '' });
    setSortOption('priority-desc');
    setActiveOnly(true);
    setCurrentPage(1);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setIsUpdatingStatus(true);
    try {
      const response = await updateEmergencyStatus(id, newStatus);
      if (response?.data) {
        setSelectedEmergency(response.data);
        fetchData(true);
      }
    } catch (err) {
      throw err;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleMissingStatusUpdate = async (id, newStatus) => {
    setIsUpdatingMissingStatus(true);
    try {
      const response = await updateMissingPersonStatus(id, newStatus);
      if (response?.data) {
        setSelectedMissingPerson(response.data);
        fetchData(true);
      }
    } catch (err) {
      throw err;
    } finally {
      setIsUpdatingMissingStatus(false);
    }
  };

  if (isLoading && !stats) {
    return <Loading message="INITIALIZING COMMAND CENTER..." />;
  }

  return (
    <div className="app-container">
      {/* LEFT NAVIGATION SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        onTabSelect={(tab) => {
          setActiveTab(tab);
          if (tab === 'missing') {
            fetchData(true);
          }
        }}
      />

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="main-content">
        <Navbar
          onManualRefresh={() => fetchData(false)}
          isRefreshing={isRefreshing}
        />

        <main className="dashboard-body">
          {/* CONNECTION ERROR STATE */}
          {error && (
            <div className="critical-alert-strip" style={{ backgroundColor: 'var(--sev-critical-bg)', borderColor: 'var(--sev-critical-border)' }}>
              <div className="alert-left">
                <AlertCircle size={18} className="error-icon" />
                <span className="alert-text">{error}</span>
              </div>
              <button className="view-critical-btn" onClick={() => fetchData(false)}>
                RETRY
              </button>
            </div>
          )}

          {/* TAB ROUTING VIEWS */}
          {activeTab === 'hospitals' ? (
            <HospitalsView
              emergencies={emergencies}
              onSelectEmergency={(emerg) => setSelectedEmergency(emerg)}
            />
          ) : activeTab === 'activity' ? (
            <ActivityLogView
              emergencies={emergencies}
              missingCases={missingCases}
              onSelectEmergency={(emerg) => setSelectedEmergency(emerg)}
              onSelectMissingPerson={(mp) => setSelectedMissingPerson(mp)}
              onRefresh={() => fetchData(false)}
            />
          ) : activeTab === 'no-zone' ? (
            <NoZoneArea isEmbedded={true} />
          ) : activeTab === 'map' ? (
            <OperationsMap
              onSelectCase={(caseId, pointType) => {
                if (pointType === 'EMERGENCY') {
                  const foundEm = emergencies.find(e => e.caseId === caseId || e._id === caseId);
                  if (foundEm) setSelectedEmergency(foundEm);
                } else {
                  const foundMp = missingCases.find(m => m.caseId === caseId || m._id === caseId);
                  if (foundMp) setSelectedMissingPerson(foundMp);
                }
              }}
            />
          ) : activeTab === 'drone' ? (
            <DroneIntelligence />
          ) : activeTab === 'missing' ? (
            <section className="table-section">
              <div className="table-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserSearch size={18} style={{ color: 'var(--sev-high)' }} />
                  <span style={{ fontWeight: 800 }}>MISSING PERSON CASES ({missingCases.length})</span>
                </div>
              </div>

              {missingCases.length === 0 ? (
                <div className="empty-incident-panel">
                  <UserSearch size={36} style={{ color: 'var(--text-muted)' }} />
                  <h3 className="empty-title">NO MISSING PERSON CASES</h3>
                  <p className="empty-desc">There are currently no registered missing person cases.</p>
                </div>
              ) : (
                <div className="incident-table-container">
                  {missingCases.map((mp) => {
                    const fullPhotoUrl = mp.photoUrl.startsWith('http') ? mp.photoUrl : `http://localhost:5000${mp.photoUrl}`;
                    return (
                      <div key={mp._id} className="incident-row" style={{ padding: '0.85rem 1.15rem' }}>
                        <div style={{ width: '54px', height: '54px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                          <img src={fullPhotoUrl} alt={mp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>

                        <div className="col-description">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{mp.name}</span>
                            <span className="type-pill" style={{ fontFamily: 'var(--font-mono)' }}>{mp.caseId}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Age {mp.age} • {mp.gender}</span>
                          </div>
                          <div className="incident-sub-meta" style={{ marginTop: '0.25rem' }}>
                            <span><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{mp.lastSeenLocation?.address || 'Delhi'}</span>
                            <span>•</span>
                            <span><Calendar size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{formatDateTime(mp.lastSeenAt)}</span>
                            {mp.clothingDescription && <span>• Wearing: {mp.clothingDescription}</span>}
                          </div>
                        </div>

                        <div className="col-status">
                          <span className={`badge-status ${mp.status === 'FOUND' ? 'status-resolved' : 'status-investigating'}`}>
                            {mp.status}
                          </span>
                        </div>

                        <div className="col-action">
                          <button
                            className="btn-view-action"
                            onClick={() => setSelectedMissingPerson(mp)}
                          >
                            VIEW CASE
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            /* OVERVIEW / EMERGENCIES TAB VIEW */
            <>
              {/* CRITICAL ALERT STRIP */}
              {stats && stats.critical > 0 && !error && (
                <CriticalAlertStrip
                  count={stats.critical}
                  onViewCritical={() => {
                    handleFilterChange('priority', 'CRITICAL');
                    setActiveOnly(true);
                  }}
                />
              )}

              {/* OPERATIONAL STATISTICS BAR */}
              {stats && (
                <section className="stats-grid">
                  <StatCard
                    label="ACTIVE INCIDENTS"
                    count={stats.active || 0}
                    variant="normal"
                    note="Monitored in queue"
                  />
                  <StatCard
                    label="CRITICAL"
                    count={stats.critical || 0}
                    variant="critical"
                    note="Requires immediate attention"
                  />
                  <StatCard
                    label="HIGH SEVERITY"
                    count={stats.high || 0}
                    variant="high"
                    note="Urgent dispatch queue"
                  />
                  <StatCard
                    label="RESOLVED / CLOSED"
                    count={stats.resolved || 0}
                    variant="normal"
                    note="Closed incidents"
                  />
                </section>
              )}

              {/* CONTROL & FILTER BAR */}
              <section>
                <FilterBar
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  sortOption={sortOption}
                  onSortChange={(val) => {
                    setSortOption(val);
                    setCurrentPage(1);
                  }}
                  activeOnly={activeOnly}
                  onToggleActiveOnly={(val) => {
                    setActiveOnly(val);
                    setCurrentPage(1);
                  }}
                  onResetFilters={handleResetFilters}
                />
              </section>

              {/* INCIDENT TABLE LIST */}
              <section>
                <EmergencyList
                  emergencies={filteredEmergencies}
                  pagination={pagination}
                  isLoading={isLoading}
                  onPageChange={(p) => setCurrentPage(p)}
                  onViewDetails={(emerg) => setSelectedEmergency(emerg)}
                  onAct={(emerg) => setActEmergency(emerg)}
                />
              </section>
            </>
          )}
        </main>
      </div>

      {/* ACT ACTION MODAL (AI HOSPITAL ASSIGNMENT) */}
      {actEmergency && (
        <ActHospitalModal
          emergency={actEmergency}
          onClose={() => setActEmergency(null)}
          onHospitalAssigned={(updatedEmergency) => {
            fetchData(true);
            if (selectedEmergency && selectedEmergency._id === updatedEmergency._id) {
              setSelectedEmergency(updatedEmergency);
            }
          }}
        />
      )}

      {/* EMERGENCY INVESTIGATION PANEL DRAWER */}
      {selectedEmergency && (
        <EmergencyDetails
          emergency={selectedEmergency}
          onClose={() => setSelectedEmergency(null)}
          onUpdateStatus={handleStatusUpdate}
          isUpdating={isUpdatingStatus}
          onActClick={(emerg) => setActEmergency(emerg)}
        />
      )}

      {/* MISSING PERSON DETAILS DRAWER */}
      {selectedMissingPerson && (
        <MissingPersonDetails
          personCase={selectedMissingPerson}
          onClose={() => setSelectedMissingPerson(null)}
          onUpdateStatus={handleMissingStatusUpdate}
          isUpdating={isUpdatingMissingStatus}
        />
      )}
    </div>
  );
};

export default Dashboard;
