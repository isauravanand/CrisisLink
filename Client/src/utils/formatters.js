/**
 * Format relative time string (e.g., "5m ago", "2h ago", "Just now")
 */
export const formatRelativeTime = (isoString) => {
  if (!isoString) return 'Unknown time';
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 30) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

/**
 * Format date into clean localized string
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Format coordinates for map/location display
 */
export const formatCoordinates = (location) => {
  if (!location) return 'Coordinates unavailable';
  const { latitude, longitude } = location;
  if (latitude === undefined || longitude === undefined) return 'Coordinates unavailable';
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

/**
 * Uppercase or titlecase formatter
 */
export const formatType = (typeStr) => {
  if (!typeStr) return 'OTHER';
  return typeStr.toUpperCase().replace('_', ' ');
};
