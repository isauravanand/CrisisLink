import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000/api`;
};

export const API_BASE_URL = getApiBaseUrl();
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const getImageUrl = (urlPath) => {
  if (!urlPath) return '';
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) return urlPath;
  return `${SERVER_ORIGIN}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Interceptor to automatically attach JWT token if present in localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lifeline_admin_token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('lifeline_admin_token');
    }
    return Promise.reject(error);
  }
);

// Helper to handle Axios error formatting
const handleApiError = (error) => {
  if (error.response) {
    const message = error.response.data?.message || 'Server error occurred';
    const err = new Error(message);
    err.statusCode = error.response.status;
    err.errors = error.response.data?.errors || null;
    throw err;
  } else if (error.request) {
    throw new Error('Unable to connect to LifeLine server. Please check network connection.');
  } else {
    throw new Error(error.message || 'An unexpected error occurred');
  }
};

/* ==========================================================================
   AUTHENTICATION APIS
   ========================================================================== */

export const loginAdmin = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getAuthMe = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const logoutAdmin = async () => {
  try {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/* ==========================================================================
   EMERGENCY APIS (PHASE 1 - 5)
   ========================================================================== */

export const createEmergency = async (data) => {
  try {
    const config = {};
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }
    const response = await apiClient.post('/emergencies', data, config);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const trackEmergency = async (caseId) => {
  try {
    const response = await apiClient.post('/emergencies/track', { caseId });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const refreshTrackedEmergency = async (sessionToken) => {
  try {
    const response = await apiClient.get('/emergencies/track/session', {
      headers: {
        Authorization: `Bearer ${sessionToken}`
      }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getEmergencies = async (params = {}) => {
  try {
    const response = await apiClient.get('/emergencies', { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getActiveEmergencies = async (params = {}) => {
  try {
    const response = await apiClient.get('/emergencies/active', { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getEmergencyStats = async () => {
  try {
    const response = await apiClient.get('/emergencies/stats');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getEmergencyById = async (id) => {
  try {
    const response = await apiClient.get(`/emergencies/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateEmergencyStatus = async (id, status) => {
  try {
    const response = await apiClient.patch(`/emergencies/${id}/status`, { status });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const actAndAssignHospital = async (id, hospitalId = null) => {
  try {
    const response = await apiClient.post(`/emergencies/${id}/act-assign-hospital`, { hospitalId });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getHospitals = async (lat, lng) => {
  try {
    const response = await apiClient.get('/emergencies/hospitals', { params: { lat, lng } });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const resetSystemData = async () => {
  try {
    const response = await apiClient.post('/emergencies/reset-system-data');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/* ==========================================================================
   MISSING PERSON APIS (PHASE 6)
   ========================================================================== */

export const createMissingPerson = async (formData) => {
  try {
    const response = await apiClient.post('/missing-persons', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getMissingPersons = async (params = {}) => {
  try {
    const response = await apiClient.get('/missing-persons', { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getActiveMissingPersons = async (params = {}) => {
  try {
    const response = await apiClient.get('/missing-persons/active', { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getMissingPersonById = async (id) => {
  try {
    const response = await apiClient.get(`/missing-persons/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateMissingPersonStatus = async (id, status) => {
  try {
    const response = await apiClient.patch(`/missing-persons/${id}/status`, { status });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const trackMissingPerson = async (caseId) => {
  try {
    const response = await apiClient.post('/missing-persons/track', { caseId });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/* ==========================================================================
   DRONE VIDEO & VIDEO INTELLIGENCE APIS (PHASE 7 & PHASE 11)
   ========================================================================== */

export const processLiveFrame = async (data) => {
  try {
    const response = await apiClient.post('/drone-videos/live-frame', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const startLiveSession = async (missingPersonId) => {
  try {
    const response = await apiClient.post('/drone-videos/live-session/start', { missingPersonId });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const stopLiveSession = async (missingPersonId) => {
  try {
    const response = await apiClient.post('/drone-videos/live-session/stop', { missingPersonId });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const uploadDroneVideo = async (formData) => {
  try {
    const response = await apiClient.post('/drone-videos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getDroneVideos = async (params = {}) => {
  try {
    const response = await apiClient.get('/drone-videos', { params });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getDroneVideoById = async (id) => {
  try {
    const response = await apiClient.get(`/drone-videos/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getDroneVideoDetections = async (id) => {
  try {
    const response = await apiClient.get(`/drone-videos/${id}/detections`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/* ==========================================================================
   VISUAL MATCHING & CANDIDATE SEARCH APIS (PHASE 8)
   ========================================================================== */

export const startVisualSearch = async (missingPersonId, droneVideoId) => {
  try {
    const response = await apiClient.post(`/missing-persons/${missingPersonId}/search`, { droneVideoId });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getMatchCandidates = async (missingPersonId) => {
  try {
    const response = await apiClient.get(`/missing-persons/${missingPersonId}/matches`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateMatchCandidateStatus = async (matchId, status) => {
  try {
    const response = await apiClient.patch(`/matches/${matchId}/status`, { status });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/* ==========================================================================
   OPERATIONS MAP, LOCATION & TIMELINE APIS (PHASE 9)
   ========================================================================== */

export const getOperationsMap = async () => {
  try {
    const response = await apiClient.get('/operations/map');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getNoZoneData = async () => {
  try {
    const response = await apiClient.get('/operations/no-zone');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getCaseTimeline = async (caseId) => {
  try {
    const response = await apiClient.get(`/cases/${caseId}/timeline`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getMissingPersonSightings = async (missingPersonId) => {
  try {
    const response = await apiClient.get(`/missing-persons/${missingPersonId}/sightings`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getHealthCheck = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export default {
  loginAdmin,
  getAuthMe,
  logoutAdmin,
  createEmergency,
  getEmergencies,
  getActiveEmergencies,
  getEmergencyStats,
  getEmergencyById,
  updateEmergencyStatus,
  actAndAssignHospital,
  getHospitals,
  resetSystemData,
  createMissingPerson,
  getMissingPersons,
  getActiveMissingPersons,
  getMissingPersonById,
  updateMissingPersonStatus,
  uploadDroneVideo,
  getDroneVideos,
  getDroneVideoById,
  getDroneVideoDetections,
  startVisualSearch,
  getMatchCandidates,
  updateMatchCandidateStatus,
  getOperationsMap,
  getNoZoneData,
  getCaseTimeline,
  getMissingPersonSightings,
  getHealthCheck
};

