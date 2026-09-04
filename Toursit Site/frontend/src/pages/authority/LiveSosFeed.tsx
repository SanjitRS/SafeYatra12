import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Send, 
  Volume2, 
  CheckCircle, 
  Radio, 
  ShieldAlert, 
  MapPin, 
  Navigation,
  Battery,
  HeartPulse,
  Filter
} from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';

export const LiveSosFeed: React.FC = () => {
  const { activeSosAlerts, acknowledgeSos, assignPatrolToSos, resolveSos, patrolUnits } = useSafety();
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsed = (timestampStr: string) => {
    const elapsedSecs = Math.max(0, Math.floor((Date.now() - new Date(timestampStr).getTime()) / 1000));
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const filteredAlerts = activeSosAlerts.filter(alert => {
    if (filterSeverity === 'all') return true;
    return alert.severity === filterSeverity;
  });

  return (
    <div className="p-4 lg:p-6 flex flex-col gap-5 max-w-[1400px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D8E0E8]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#D64545] animate-ping" />
            <h1 className="text-xl font-extrabold text-[#0B3D62]">
              Live SOS Distress Stream
            </h1>
          </div>
          <p className="text-xs text-[#5C6B78] mt-0.5">
            Synchronous satellite triage queue with automatic elapsed response stopwatch
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#D8E0E8] self-start">
          <Filter className="w-3.5 h-3.5 text-[#5C6B78] ml-2 mr-1" />
          {[
            { id: 'all', label: 'All Signals' },
            { id: 'critical', label: 'Life-Critical' },
            { id: 'priority', label: 'Priority Assist' },
            { id: 'advisory', label: 'Advisories' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterSeverity(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterSeverity === tab.id
                  ? 'bg-[#0B3D62] text-white shadow-sm'
                  : 'text-[#5C6B78] hover:text-[#1A2530]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#D8E0E8] shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#3FA34D]/15 flex items-center justify-center text-[#3FA34D] mb-3">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-[#0B3D62]">
              All Sectors Currently Clear
            </h3>
            <p className="text-xs text-[#5C6B78] max-w-sm mt-1">
              No active distress alerts matching this filter. Monitoring telemetry repeaters across Manali and Rohtang basins.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            const isAssigned = alert.status === 'assigned';
            const isResolved = alert.status === 'resolved';

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-3xl p-5 border shadow-sm transition-all ${
                  isCritical ? 'border-[#D64545] shadow-md' : 'border-[#D8E0E8]'
                }`}
                style={{
                  borderLeftWidth: '6px',
                  borderLeftColor: isCritical ? '#D64545' : isAssigned ? '#1C7293' : '#F2A541'
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#F4F7FA]">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-inner ${
                      isCritical ? 'bg-[#D64545]' : 'bg-[#1C7293]'
                    }`}>
                      SOS
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-[#1A2530]">
                          {alert.touristName}
                        </h3>
                        <span className="text-xs font-mono font-bold text-[#5C6B78] bg-[#F4F7FA] px-2 py-0.5 rounded-lg border border-[#E8EDF2]">
                          #{alert.touristId}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isCritical ? 'bg-[#D64545]/15 text-[#D64545]' : 'bg-[#F2A541]/15 text-[#F2A541]'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#5C6B78] mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#1C7293]" />
                          {alert.location.address || 'Himalayan Ridge Sector'}
                        </span>
                        <span>•</span>
                        <span>Phone: <strong>{alert.touristPhone}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Stopwatch */}
                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="px-3 py-1.5 rounded-xl bg-[#D64545]/15 text-[#D64545] font-mono font-extrabold text-sm flex items-center gap-1.5">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>{formatElapsed(alert.timestamp)}</span>
                    </div>
                    <span className="text-xs text-[#5C6B78] uppercase tracking-wider font-semibold">
                      Elapsed
                    </span>
                  </div>
                </div>

                {/* Telemetry Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F4F7FA] p-3 rounded-2xl my-3 border border-[#E8EDF2] text-xs">
                  <div>
                    <span className="text-[10px] text-[#5C6B78] uppercase block">Altitude</span>
                    <span className="font-bold text-[#1A2530]">{alert.altitudeM} meters ASL</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5C6B78] uppercase block">Device Battery</span>
                    <span className={`font-bold ${alert.batteryLevel < 20 ? 'text-[#D64545]' : 'text-[#1A2530]'}`}>
                      {alert.batteryLevel}% remaining
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5C6B78] uppercase block">Heart Pulse (Biometrics)</span>
                    <span className="font-bold text-[#1A2530] flex items-center gap-1">
                      <HeartPulse className="w-3.5 h-3.5 text-[#D64545]" />
                      {alert.pulseBpm || 110} BPM
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5C6B78] uppercase block">Impact Sensor</span>
                    <span className="font-bold text-[#D64545]">{alert.impactG ? `${alert.impactG}G abrupt fall` : 'Normal'}</span>
                  </div>
                </div>

                <p className="text-xs text-[#5C6B78] leading-relaxed mb-4">
                  <strong className="text-[#1A2530]">Emergency Narrative:</strong> {alert.notes}
                </p>

                {/* Assigned Unit Status or Action Strip */}
                {isAssigned && alert.assignedUnit && (
                  <div className="bg-[#1C7293]/10 border border-[#1C7293]/20 p-3 rounded-2xl mb-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[#0B3D62]">
                      <Navigation className="w-4 h-4 text-[#1C7293]" />
                      <span>
                        <strong>{alert.assignedUnit.name}</strong> en route (Lead: {alert.assignedUnit.officer}).
                        Distance: ~{alert.assignedUnit.distanceMeters}m.
                      </span>
                    </div>
                    <span className="font-extrabold text-[#0B3D62]">ETA ~{alert.assignedUnit.etaMinutes} mins</span>
                  </div>
                )}

                {/* Tactical Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F4F7FA]">
                  <div className="flex flex-wrap items-center gap-2">
                    {alert.status === 'triggered' && (
                      <button
                        onClick={() => acknowledgeSos(alert.id)}
                        className="px-4 py-2 rounded-xl bg-[#0B3D62] text-white text-xs font-bold hover:bg-[#134B73] transition-colors"
                      >
                        Acknowledge Signal
                      </button>
                    )}

                    <button
                      onClick={() => assignPatrolToSos(alert.id, 'UNIT-ALPHA-2')}
                      className="px-4 py-2 rounded-xl bg-[#D64545] text-white text-xs font-bold hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isAssigned ? 'Re-Deploy Unit Alpha-2' : 'Deploy Mountain Patrol'}</span>
                    </button>

                    <button
                      onClick={() => alert(`Siren Beacon remotely pulsed on device #${alert.touristId}`)}
                      className="px-3 py-2 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] text-[#0B3D62] text-xs font-bold hover:bg-[#E8EDF2] flex items-center gap-1.5"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#1C7293]" />
                      <span>Activate Beacon</span>
                    </button>
                  </div>

                  <button
                    onClick={() => resolveSos(alert.id, 'Officer verified safe evacuation')}
                    className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    Close as Resolved
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
