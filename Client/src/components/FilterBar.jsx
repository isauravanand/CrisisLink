import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

export const FilterBar = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  sortOption,
  onSortChange,
  activeOnly,
  onToggleActiveOnly,
  onResetFilters
}) => {
  return (
    <div className="control-bar">
      {/* Search Input Box */}
      <div className="search-box">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search incidents by location, description..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="control-selects">
        {/* Status Dropdown */}
        <select
          className="control-select"
          value={filters.status || ''}
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <option value="">STATUS: ALL</option>
          <option value="REPORTED">PENDING</option>
          <option value="INVESTIGATING">INVESTIGATING</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
          <option value="DISMISSED">DISMISSED</option>
        </select>

        {/* Priority/Severity Dropdown */}
        <select
          className="control-select"
          value={filters.priority || ''}
          onChange={(e) => onFilterChange('priority', e.target.value)}
        >
          <option value="">SEVERITY: ALL</option>
          <option value="CRITICAL">CRITICAL</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>

        {/* Emergency Type Dropdown */}
        <select
          className="control-select"
          value={filters.emergencyType || ''}
          onChange={(e) => onFilterChange('emergencyType', e.target.value)}
        >
          <option value="">TYPE: ALL</option>
          <option value="FIRE">FIRE</option>
          <option value="MEDICAL">MEDICAL</option>
          <option value="FLOOD">FLOOD</option>
          <option value="EARTHQUAKE">EARTHQUAKE</option>
          <option value="ACCIDENT">ACCIDENT</option>
          <option value="TRAIL_SEARCH">TRAIL SEARCH</option>
          <option value="OTHER">OTHER</option>
        </select>

        {/* Sort Dropdown */}
        <select
          className="control-select"
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="priority-desc">SORT: HIGHEST PRIORITY</option>
          <option value="createdAt-desc">SORT: NEWEST FIRST</option>
          <option value="createdAt-asc">SORT: OLDEST FIRST</option>
        </select>

        {/* Active Only Toggle */}
        <label className="toggle-active">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => onToggleActiveOnly(e.target.checked)}
          />
          <span className="toggle-label">Active Only</span>
        </label>

        {(searchTerm || filters.status || filters.priority || filters.emergencyType || !activeOnly || sortOption !== 'priority-desc') && (
          <button
            className="reset-filter-btn"
            onClick={onResetFilters}
            title="Reset filters to default"
          >
            <RotateCcw size={13} />
            <span>RESET</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
