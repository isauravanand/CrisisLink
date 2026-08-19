import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Landing from './pages/Landing';
import ReportEmergency from './pages/ReportEmergency';
import MyReport from './pages/MyReport';
import MissingPerson from './pages/MissingPerson';
import Dashboard from './pages/Dashboard';
import AdminLogin from './pages/AdminLogin';
import TrackIncident from './pages/TrackIncident';
import TrackMissingPerson from './pages/TrackMissingPerson';
import NoZoneArea from './pages/NoZoneArea';
import ReportInjury from './pages/ReportInjury';
import { OfflineBanner } from './components/OfflineBanner';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <OfflineBanner />
        <Routes>
          {/* PUBLIC USER APPLICATION ROUTES */}
          <Route path="/" element={<Landing />} />
          <Route path="/report" element={<ReportEmergency />} />
          <Route path="/report-injury" element={<ReportInjury />} />
          <Route path="/injury-ai" element={<ReportInjury />} />
          <Route path="/report/:id" element={<MyReport />} />
          <Route path="/missing-person" element={<MissingPerson />} />
          <Route path="/track-incident" element={<TrackIncident />} />
          <Route path="/track" element={<TrackIncident />} />
          <Route path="/track-missing-person" element={<TrackMissingPerson />} />
          <Route path="/track-missing" element={<TrackMissingPerson />} />
          <Route path="/no-zone-area" element={<NoZoneArea />} />
          <Route path="/no-zone" element={<NoZoneArea />} />

          {/* ADMIN AUTHENTICATION ROUTE */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* PROTECTED RESPONDER COMMAND CENTER ROUTES */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/emergencies" element={<Dashboard />} />
            <Route path="/admin/missing-persons" element={<Dashboard />} />
            <Route path="/admin/drone" element={<Dashboard />} />
            <Route path="/admin/map" element={<Dashboard />} />
            <Route path="/admin/no-zone" element={<Dashboard />} />
          </Route>

          {/* FALLBACK CATCH-ALL */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

