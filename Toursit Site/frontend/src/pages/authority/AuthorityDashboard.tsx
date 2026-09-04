import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Activity, 
  ShieldCheck, 
  Map, 
  Users, 
  Radio, 
  Search, 
  Volume2, 
  Send, 
  CheckCircle, 
  ArrowRight,
  Clock,
  Compass,
  PhoneCall,
  X
} from 'lucide-react';
import { TacticalMap } from '../../components/common/TacticalMap';
import { useSafety } from '../../lib/safetyStore';
import { SosAlert } from '../../types';

export const AuthorityDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    activeSosAlerts, 
    incidents, 
    riskZones, 
    patrolUnits, 
    acknowledgeSos, 
    assignPatrolToSos,
    verifyRiskZone,
    userCoords,
    userLocationName
  } = useSafety();

  const authorityMapCenter: [number, number] = activeSosAlerts.length > 0 
    ? [activeSosAlerts[0].location.lat, activeSosAlerts[0].location.lng] 
    : userCoords;

  const [mapFilter, setMapFilter] = useState<'all' | 'sos' | 'hazards' | 'patrols'>('all');
  const [quickLookupOpen, setQuickLookupOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('SY-84920');
  const [lookupResult, setLookupResult] = useState<any | null>({
    id: 'SY-84920',
    name: 'Priya Sharma',
    status: 'Verified Citizen',
    dob: '14/08/1994',
    blood: 'B+',
    emergencyContact: '+91 98112-40912 (Spouse)',
    medicalFlag: 'Mild Asthma (Inhaler user)',
    stay: 'Pine Crest Resort, Old Manali',
    validUntil: '28 Oct 2025'
  });

  // Master live telemetry sweep UTC clock
  const [utcTime, setUtcTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Ticking seconds for live SOS elapsed timers
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (timestampStr: string) => {
    const elapsedSecs = Math.max(0, Math.floor((Date.now() - new Date(timestampStr).getTime()) / 1000));
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleLookup = () => {
    if (lookupQuery.includes('99214')) {
      setLookupResult({
        id: 'SY-99214-IN',
        name: 'Aarav Sharma',
        status: 'Solo Permit Verified',
        dob: '22/04/1996',
        blood: 'B+',
        emergencyContact: '+91 98765-43211 (Sister - Priya)',
        medicalFlag: 'Mild Asthma, Penicillin Allergy',
        stay: 'Snow Crest Inn, Old Manali',
        validUntil: '28 Oct 2025'
      });
    } else {
      setLookupResult({
        id: lookupQuery || 'SY-84920',
        name: 'Priya Sharma',
        status: 'Verified Citizen',
        dob: '14/08/1994',
        blood: 'B+',
        emergencyContact: '+91 98112-40912 (Spouse)',
        medicalFlag: 'Mild Asthma (Inhaler user)',
        stay: 'Pine Crest Resort, Old Manali',
        validUntil: '28 Oct 2025'
      });
    }
  };

  const activeSosCount = activeSosAlerts.filter(a => a.status !== 'resolved' && a.status !== 'cancelled').length;
  const criticalCount = activeSosAlerts.filter(a => a.severity === 'critical' && a.status === 'triggered').length;

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-6 max-w-[1720px] mx-auto w-full">
      {/* Sleek Interface Top Command Header */}
      <header className="h-20 bg-white rounded-2xl border border-gray-200 px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4 sm:gap-6">
          <h2 className="text-xl font-bold text-[#1A2530]">Authority Command Center</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-[#D64545]/10 text-[#D64545] rounded-full text-xs font-bold">
            <span className="w-2 h-2 bg-[#D64545] rounded-full animate-ping" />
            <span>{activeSosCount} ACTIVE SOS ALERTS</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-[#5C6B78] font-medium uppercase">Local Server Time</p>
            <p className="font-mono font-bold text-sm text-[#1A2530]">{utcTime}</p>
          </div>

          <button
            onClick={() => setQuickLookupOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#0B3D62] text-white hover:bg-[#134B73] text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden md:inline">Tourist ID Lookup</span>
            <span className="md:hidden">Lookup</span>
          </button>
        </div>
      </header>

      {/* Telemetry Metric Indicators (Sleek Interface Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Metric 1: Active SOS Alarms */}
        <div 
          onClick={() => navigate('/authority/live-sos')}
          className="relative overflow-hidden rounded-2xl bg-white p-5 flex items-center justify-between shadow-sm border border-gray-200 cursor-pointer hover:border-[#D64545] transition-all group"
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D64545] animate-ping" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#D64545]">
                Active SOS Alarms
              </span>
            </div>
            <span className="text-3xl font-black text-[#D64545] mt-1 leading-tight">
              0{activeSosCount}
            </span>
            <span className="text-xs text-[#5C6B78] mt-1 font-medium">
              {criticalCount} Life-Critical • Real-time
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#D64545]/10 flex items-center justify-center text-[#D64545] group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Incident Queue */}
        <div 
          onClick={() => navigate('/authority/incidents')}
          className="relative overflow-hidden rounded-2xl bg-white p-5 flex items-center justify-between shadow-sm border border-gray-200 cursor-pointer hover:border-[#1C7293] transition-all group"
        >
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6B78]">
              Incident Queue
            </span>
            <span className="text-3xl font-black text-[#0B3D62] mt-1 leading-tight">
              {incidents.length}
            </span>
            <span className="text-xs text-[#5C6B78] mt-1 font-medium">
              4 Dispatched • 10 Monitoring
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#F2A541]/15 flex items-center justify-center text-[#F2A541] group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Active Geofences */}
        <div 
          onClick={() => navigate('/authority/zones')}
          className="relative overflow-hidden rounded-2xl bg-white p-5 flex items-center justify-between shadow-sm border border-gray-200 cursor-pointer hover:border-[#1C7293] transition-all group"
        >
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6B78]">
              Active Geofences
            </span>
            <span className="text-3xl font-black text-[#0B3D62] mt-1 leading-tight">
              0{riskZones.length}
            </span>
            <span className="text-xs text-[#5C6B78] mt-1 font-medium">
              5 Enforced • 3 AI Alerts
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#1C7293]/15 flex items-center justify-center text-[#1C7293] group-hover:scale-105 transition-transform">
            <Map className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Tourists in High-Risk Zones */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 flex items-center justify-between shadow-sm border border-gray-200">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6B78]">
              Tourists in Risk Zones
            </span>
            <span className="text-3xl font-black text-[#0B3D62] mt-1 leading-tight">
              128
            </span>
            <span className="text-xs text-[#5C6B78] mt-1 font-medium">
              98.4% GPS Precision Locked
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#0B3D62]/10 flex items-center justify-center text-[#0B3D62]">
            <Users className="w-6 h-6 text-[#1C7293]" />
          </div>
        </div>
      </div>

      {/* Main Operational Split Console Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tactical Spatial GIS Operations Map (7 cols) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-[#F4F7FA]/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1C7293]/15 flex items-center justify-center text-[#1C7293]">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1A2530] leading-tight">
                    Tactical Spatial Command (GIS Layer v4.2)
                  </h3>
                  <p className="text-xs text-[#5C6B78]">
                    Manali Sector & Upper Beas Catchment Basin
                  </p>
                </div>
              </div>

              {/* Layer Toggles */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200">
                {[
                  { id: 'all', label: 'All Layers' },
                  { id: 'sos', label: 'SOS Only' },
                  { id: 'hazards', label: 'AI Hazards' },
                  { id: 'patrols', label: 'Patrol Units' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMapFilter(tab.id as typeof mapFilter)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      mapFilter === tab.id
                        ? 'bg-[#0B3D62] text-white shadow-sm'
                        : 'text-[#5C6B78] hover:text-[#1A2530]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactical Leaflet Map Canvas Container */}
            <div className="w-full h-[520px] relative">
              {/* Map View Overlay Card (from Sleek Interface) */}
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                <div className="bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-md border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-[#5C6B78] mb-1">Layer Quick Filter</p>
                  <div className="flex items-center gap-3 text-xs font-semibold text-[#1A2530]">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={mapFilter === 'all' || mapFilter === 'hazards'} 
                        onChange={() => setMapFilter(f => f === 'hazards' ? 'all' : 'hazards')} 
                        className="accent-[#1C7293] rounded"
                      /> 
                      <span>Risk Zones</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={mapFilter === 'all' || mapFilter === 'patrols'} 
                        onChange={() => setMapFilter(f => f === 'patrols' ? 'all' : 'patrols')} 
                        className="accent-[#1C7293] rounded"
                      /> 
                      <span>Patrols</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Floating District Safety Status Card (from Sleek Interface design) */}
              <div className="absolute bottom-6 right-6 z-20 bg-white p-4 rounded-xl shadow-xl border border-gray-100 w-52 pointer-events-auto">
                <p className="text-xs font-bold mb-2 text-[#1A2530]">District Safety Status</p>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="font-medium text-[#1A2530]">Sector 3 (Old Town)</span>
                      <span className="text-[#D64545] font-bold uppercase">High Risk</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#D64545] w-[85%] h-full rounded-full"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="font-medium text-[#1A2530]">Valley Square / Solang</span>
                      <span className="text-[#3FA34D] font-bold uppercase">Low Risk</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#3FA34D] w-[15%] h-full rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              <TacticalMap
                center={authorityMapCenter}
                zoom={13}
                filterMode={mapFilter}
                sosAlerts={activeSosAlerts}
                riskZones={riskZones}
                patrolUnits={patrolUnits}
                userLocation={userCoords}
                className="w-full h-full"
              />
            </div>

            {/* Bottom Coordinate & Sensor Datum */}
            <div className="flex flex-wrap items-center justify-between text-xs text-[#5C6B78] p-3 border-t border-gray-100 bg-[#F4F7FA]/30">
              <span>Grid Center: {userLocationName ? `${userLocationName} (${authorityMapCenter[0].toFixed(4)}° N, ${authorityMapCenter[1].toFixed(4)}° E)` : `${authorityMapCenter[0].toFixed(4)}° N, ${authorityMapCenter[1].toFixed(4)}° E`} (WGS84)</span>
              <span className="flex items-center gap-1.5 font-semibold text-[#1C7293]">
                <span className="w-2 h-2 rounded-full bg-[#1C7293] animate-pulse" />
                108 Emergency Telemetry Repeaters Operational
              </span>
            </div>
          </div>

          {/* Secondary Operational Panels: Live Patrol Readiness & AI Hazard Prediction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patrol Readiness */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-[#0B3D62]">Patrol Readiness</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8EDF2] text-xs font-extrabold text-[#1C7293]">
                  6 Dispatched / 2 Reserve
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F7FA] border border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0B3D62] text-white flex items-center justify-center font-bold text-xs">
                      A2
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1A2530] block">Unit Alpha-2 (Mountain Rescue)</span>
                      <span className="text-[10px] text-[#5C6B78]">Dispatched • Intercepting SY-39102</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#1C7293]">34 km/h</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F7FA] border border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#1C7293] text-white flex items-center justify-center font-bold text-xs">
                      T4
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1A2530] block">Patrol Team 4 (St. John Post)</span>
                      <span className="text-[10px] text-[#5C6B78]">Standby at Base</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => assignPatrolToSos('SOS-84920', 'UNIT-PATROL-4')}
                    className="px-2.5 py-1 rounded-lg bg-[#0B3D62] hover:bg-[#134B73] text-white text-[11px] font-bold transition-colors"
                  >
                    Deploy
                  </button>
                </div>
              </div>
            </div>

            {/* AI Hazard Prediction */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#0B3D62]">AI Hazard Prediction</span>
                <span className="text-xs font-extrabold text-[#D64545] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> High Landslide Risk
                </span>
              </div>

              <p className="text-xs text-[#5C6B78] leading-relaxed">
                Monsoon saturation in Sector 3 reached 84% at 03:40 UTC. Micro-fissure expansion detected (1.2mm/h). Geofence auto-expanded by 350 meters.
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                <span className="text-[#5C6B78]">Confidence: <strong>94.2%</strong></span>
                <button
                  onClick={() => alert('Hazard push notification dispatched to 128 registered devices in Sector 3')}
                  className="text-xs font-bold text-[#1C7293] hover:underline"
                >
                  Broadcast Push Warning
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sleek Interface Incident Feed & District Quick Actions (5 cols / 380px) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          {/* Card 1: Live Incident Feed (matching Sleek Interface style) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#F4F7FA]/50">
              <h3 className="font-bold text-sm uppercase tracking-wide text-[#1A2530]">Live Incident Feed</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1C7293] animate-pulse" />
                <span className="text-[10px] font-bold text-[#1C7293] uppercase tracking-wider">REAL-TIME</span>
              </div>
            </div>

            <div className="p-4 space-y-3.5 max-h-[460px] overflow-y-auto">
              {activeSosAlerts
                .filter(a => a.status !== 'resolved' && a.status !== 'cancelled')
                .map((alert) => {
                  const isCritical = alert.severity === 'critical';
                  const isAssigned = alert.status === 'assigned';

                  return (
                    <div
                      key={alert.id}
                      className={`border-l-4 p-3.5 rounded-r-xl transition-all ${
                        isCritical 
                          ? 'border-[#D64545] bg-[#D64545]/5' 
                          : isAssigned 
                            ? 'border-[#1C7293] bg-[#1C7293]/5' 
                            : 'border-[#F2A541] bg-[#F2A541]/5'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold uppercase ${
                            isCritical ? 'text-[#D64545]' : isAssigned ? 'text-[#1C7293]' : 'text-[#F2A541]'
                          }`}>
                            {isCritical ? 'SOS ALERT' : isAssigned ? 'PATROL ASSIGNED' : 'SOS DISPATCH'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#5C6B78] font-bold">
                          {formatElapsed(alert.timestamp)} ELAPSED
                        </span>
                      </div>

                      <p className="text-sm font-bold text-[#1A2530]">{alert.touristName}</p>
                      <p className="text-xs text-[#5C6B78] mb-3 leading-tight mt-0.5">
                        Location: {alert.location.address || 'GPS Coordinates'}. Altitude: {alert.altitudeM}m. Battery: {alert.batteryLevel}%.
                      </p>

                      <div className="flex gap-2">
                        {alert.status === 'triggered' ? (
                          <button
                            onClick={() => acknowledgeSos(alert.id)}
                            className="flex-1 bg-[#D64545] text-white text-xs font-bold py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                          >
                            ACKNOWLEDGE
                          </button>
                        ) : (
                          <button
                            onClick={() => assignPatrolToSos(alert.id, 'UNIT-ALPHA-2')}
                            className="flex-1 bg-[#1C7293] text-white text-xs font-bold py-2 rounded-lg hover:bg-[#155a75] transition-colors shadow-sm"
                          >
                            {isAssigned ? 'DISPATCHED' : 'ASSIGN PATROL'}
                          </button>
                        )}
                        <button
                          onClick={() => alert(`Remote distress beacon triggered on device #${alert.touristId}`)}
                          className="bg-white border border-gray-200 text-[#0B3D62] hover:bg-gray-50 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center"
                          title="Trigger Beacon"
                        >
                          <Volume2 className="w-4 h-4 text-[#1C7293]" />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* Sample Incident report item from Design HTML */}
              <div className="border-l-4 border-[#F2A541] bg-[#F2A541]/5 p-3.5 rounded-r-xl">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-[#F2A541] uppercase">INCIDENT REPORT</span>
                  <span className="text-[10px] font-mono text-[#5C6B78] font-bold">12 MIN AGO</span>
                </div>
                <p className="text-sm font-bold text-[#1A2530]">Mark Thompson</p>
                <p className="text-xs text-[#5C6B78] mb-2 leading-tight">
                  Type: Trail rockfall observation near Solang Valley Outpost Gate B.
                </p>
                <div className="flex gap-2 items-center">
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded">
                    PENDING REVIEW
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Link to Resolved Incidents */}
            <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs bg-[#F4F7FA]/30">
              <span className="text-[#5C6B78]">11 incidents archived</span>
              <button
                onClick={() => navigate('/authority/incidents')}
                className="text-xs font-bold text-[#1C7293] hover:underline flex items-center gap-1"
              >
                <span>Full Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Emergency Resources / District Quick Actions (Direct from Sleek Interface design) */}
          <div className="h-[160px] bg-[#0B3D62] rounded-2xl p-5 text-white flex flex-col justify-between shadow-sm">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#1C7293]">
                Emergency Resources
              </p>
              <h4 className="text-lg font-bold text-white">District Quick Actions</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/authority/live-sos')}
                className="flex items-center justify-center gap-2 bg-[#1C7293] hover:bg-[#155a75] py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>DISPATCH</span>
              </button>
              <button
                onClick={() => alert('Civil Protection Emergency Alert broadcasted across all active mobile beacons in District Central.')}
                className="flex items-center justify-center gap-2 border border-white/30 hover:bg-white/10 py-2.5 rounded-lg text-xs font-bold transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-white" />
                <span>BROADCAST</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fast Digital ID Quick-Lookup Modal */}
      {quickLookupOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B3D62]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#D8E0E8]">
            <div className="p-4 bg-[#0B3D62] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-cyan-300" />
                <div>
                  <h3 className="text-base font-bold">Fast Digital ID Verification</h3>
                  <p className="text-xs text-cyan-200">Instant token lookup for field responders</p>
                </div>
              </div>
              <button
                onClick={() => setQuickLookupOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-[#1A2530] block mb-1.5">
                  Enter SafeYatra Tourist ID or Scan Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    placeholder="e.g. SY-84920 or SY-99214-IN"
                    className="flex-1 p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] font-mono font-bold text-xs text-[#1A2530] focus:outline-none focus:border-[#1C7293]"
                  />
                  <button
                    onClick={handleLookup}
                    className="px-4 py-2.5 rounded-xl bg-[#0B3D62] text-white font-bold text-xs hover:bg-[#134B73]"
                  >
                    Verify
                  </button>
                </div>
              </div>

              {lookupResult && (
                <div className="bg-[#F4F7FA] p-4 rounded-2xl border border-[#E8EDF2] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#1C7293] text-white flex items-center justify-center font-extrabold text-base">
                        {lookupResult.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#0B3D62]">
                          {lookupResult.name}
                        </h4>
                        <span className="text-xs text-[#5C6B78]">
                          DOB: {lookupResult.dob} • Blood: <strong>{lookupResult.blood}</strong>
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#3FA34D]/15 text-[#3FA34D] text-xs font-extrabold">
                      {lookupResult.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#E8EDF2]">
                    <div className="bg-white p-2.5 rounded-xl border border-[#E8EDF2]">
                      <span className="text-[10px] text-[#5C6B78] block">Emergency Contact</span>
                      <span className="font-bold text-[#0B3D62]">{lookupResult.emergencyContact}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-[#E8EDF2]">
                      <span className="text-[10px] text-[#5C6B78] block">Medical Flag</span>
                      <span className="font-bold text-[#D64545]">{lookupResult.medicalFlag}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#5C6B78] pt-1">
                    <span>Stay: {lookupResult.stay}</span>
                    <span className="font-bold text-[#3FA34D]">{lookupResult.validUntil}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setQuickLookupOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F4F7FA] text-[#5C6B78] text-xs font-bold hover:bg-[#E8EDF2]"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    alert(`Verified medical sheet relayed to Mountain Patrol Unit 4 for ${lookupResult.name}`);
                    setQuickLookupOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0B3D62] text-white text-xs font-bold hover:bg-[#134B73]"
                >
                  Relay to Field Patrol
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
