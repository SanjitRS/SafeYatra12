import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafetyProvider } from './lib/safetyStore';

// Common Components
import { GlobalHeader } from './components/common/GlobalHeader';

// Tourist Pages
import { TouristLayout } from './pages/tourist/TouristLayout';
import { TouristHome } from './pages/tourist/TouristHome';
import { SosFlow } from './pages/tourist/SosFlow';
import { DigitalTouristId } from './pages/tourist/DigitalTouristId';
import { ReportIncident } from './pages/tourist/ReportIncident';
import { LocationSafetyMap } from './pages/tourist/LocationSafetyMap';
import { SafetyResources } from './pages/tourist/SafetyResources';
import { ProfileSafetyInfo } from './pages/tourist/ProfileSafetyInfo';
import { TouristAuth } from './pages/tourist/TouristAuth';

// Authority Pages
import { AuthorityLayout } from './pages/authority/AuthorityLayout';
import { AuthorityDashboard } from './pages/authority/AuthorityDashboard';
import { LiveSosFeed } from './pages/authority/LiveSosFeed';
import { IncidentManagement } from './pages/authority/IncidentManagement';
import { RiskZoneManagement } from './pages/authority/RiskZoneManagement';
import { TouristIdVerification } from './pages/authority/TouristIdVerification';
import { AuthorityAuth } from './pages/authority/AuthorityAuth';

import { Capacitor } from '@capacitor/core';

const queryClient = new QueryClient();

export default function App() {
  const isNative = Capacitor.isNativePlatform();

  return (
    <QueryClientProvider client={queryClient}>
      <SafetyProvider>
        <BrowserRouter>
          {/* Global Header is displayed on desktop web only, hidden on Android app */}
          {!isNative && <GlobalHeader />}
          <Routes>
            {/* Native Android opens Tourist App directly; Web opens Authority Console directly */}
            <Route path="/" element={<Navigate to={isNative ? "/tourist" : "/authority"} replace />} />

            {/* Tourist App Routes */}
            <Route path="/tourist" element={<TouristLayout />}>
              <Route index element={<TouristHome />} />
              <Route path="sos" element={<SosFlow />} />
              <Route path="id" element={<DigitalTouristId />} />
              <Route path="report" element={<ReportIncident />} />
              <Route path="map" element={<LocationSafetyMap />} />
              <Route path="resources" element={<SafetyResources />} />
              <Route path="profile" element={<ProfileSafetyInfo />} />
              <Route path="auth" element={<TouristAuth />} />
            </Route>

            {/* Authority Console Routes */}
            <Route path="/authority/login" element={<AuthorityAuth />} />
            <Route path="/authority" element={<AuthorityLayout />}>
              <Route index element={<AuthorityDashboard />} />
              <Route path="live-sos" element={<LiveSosFeed />} />
              <Route path="incidents" element={<IncidentManagement />} />
              <Route path="zones" element={<RiskZoneManagement />} />
              <Route path="verify-id" element={<TouristIdVerification />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to={isNative ? "/tourist" : "/authority"} replace />} />
          </Routes>
        </BrowserRouter>
      </SafetyProvider>
    </QueryClientProvider>
  );
}
