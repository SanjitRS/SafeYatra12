import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, MapPin, Navigation, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TacticalMap } from '../../components/common/TacticalMap';
import { useSafety } from '../../lib/safetyStore';

export const LocationSafetyMap: React.FC = () => {
  const navigate = useNavigate();
  const { riskZones, userCoords, sosAlerts, patrolUnits, refreshLocation, userAccuracy, setUserCoords, setUserLocationName } = useSafety();
  const [permissionAcknowledged, setPermissionAcknowledged] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'hazards' | 'sos'>('all');

  return (
    <div className="flex flex-col w-full h-full min-h-[640px] relative">
      {/* Header */}
      <div className="p-4 bg-white border-b border-[#E8EDF2] flex items-center justify-between z-20">
        <button
          onClick={() => navigate('/tourist')}
          className="flex items-center gap-1.5 text-xs font-bold text-[#0B3D62]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#1C7293]" />
          <span className="text-xs font-extrabold uppercase text-[#0B3D62]">
            Location Safety Radar
          </span>
        </div>
        <button
          onClick={() => {
            if (!('geolocation' in navigator)) {
              alert('Geolocation is not supported in this browser.');
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const acc = Math.round(pos.coords.accuracy || 10);
                setUserCoords([lat, lng]);
                alert(`Real Hardware GPS Acquired!\nLatitude: ${lat.toFixed(5)}\nLongitude: ${lng.toFixed(5)}\nAccuracy: ±${acc} meters`);
              },
              (err) => {
                alert(`Device GPS Error (Code ${err.code}): ${err.message}\nPlease allow Location access in browser settings.`);
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          }}
          className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 px-3 py-1.5 rounded-full cursor-pointer transition-colors shadow-xs"
          title="Click to query hardware GPS on this device"
        >
          <Navigation className="w-3 h-3 text-emerald-600 animate-pulse" />
          <span>Lock Exact GPS</span>
        </button>
      </div>

      {/* Trust & Location Permission Banner (Reassurance focus) */}
      {permissionAcknowledged ? (
        <div className="bg-[#1C7293]/10 px-4 py-2 border-b border-[#1C7293]/20 flex items-center justify-between text-[11px] text-[#0B3D62]">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#1C7293] shrink-0" />
            <span>High-precision rescue telemetry enabled via ISRO NavIC.</span>
          </div>
          <button 
            onClick={() => setPermissionAcknowledged(false)}
            className="text-[10px] font-bold text-[#1C7293] hover:underline"
          >
            Why this matters?
          </button>
        </div>
      ) : (
        <div className="bg-[#0B3D62] text-white p-4 mx-3 my-2 rounded-2xl shadow-md space-y-2 text-xs animate-in fade-in">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5 text-[#F2A541]">
              <ShieldCheck className="w-4 h-4" />
              Why SafeYatra needs your location
            </span>
            <button 
              onClick={() => setPermissionAcknowledged(true)}
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-cyan-100 leading-relaxed text-[11px]">
            Himalayan valleys have sudden weather shifts and deep ravines. When you tap SOS or enter an avalanche zone, SafeYatra immediately broadcasts your 3D altitude and satellite position to local search teams without delay.
          </p>
          <div className="flex items-center justify-end pt-1">
            <button
              onClick={() => setPermissionAcknowledged(true)}
              className="px-3 py-1 bg-[#1C7293] text-white font-bold rounded-lg text-[10px]"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}

      {/* Search / Set Exact Location Bar */}
      <div className="px-4 py-2.5 bg-white border-b border-[#E8EDF2] flex items-center gap-2 z-20">
        <div className="flex-1 flex items-center gap-2 bg-[#F4F7FA] border border-[#D8E0E8] rounded-xl px-3 py-1.5 text-xs">
          <MapPin className="w-3.5 h-3.5 text-[#1C7293] shrink-0" />
          <input
            type="text"
            placeholder="Search your street/area or click map..."
            className="bg-transparent w-full outline-hidden text-[#1A2530] text-xs"
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                const query = (e.target as HTMLInputElement).value.trim();
                if (!query) return;
                try {
                  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data && data[0]) {
                      const lat = parseFloat(data[0].lat);
                      const lng = parseFloat(data[0].lon);
                      setUserCoords([lat, lng]);
                      setUserLocationName(data[0].display_name.split(',').slice(0, 2).join(','));
                    }
                  }
                } catch {}
              }
            }}
          />
        </div>
        <button
          onClick={() => {
            const place = prompt('Enter your exact city/area (e.g., Koramangala, Whitefield, Indiranagar, Electronic City, Jayanagar):');
            if (place) {
              fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`)
                .then(r => r.json())
                .then(data => {
                  if (data && data[0]) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    setUserCoords([lat, lng]);
                    setUserLocationName(data[0].display_name.split(',').slice(0, 2).join(','));
                  }
                }).catch(() => {});
            }
          }}
          className="px-3 py-1.5 bg-[#0B3D62] text-white rounded-xl text-xs font-bold shrink-0 hover:bg-[#134B73] transition-colors"
        >
          Pin Area
        </button>
      </div>

      {/* Filter Layer Pills */}
      <div className="px-4 py-2 bg-white/90 backdrop-blur-sm border-b border-[#E8EDF2] flex items-center justify-between gap-1.5 z-20">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#0B3D62] text-white'
                : 'bg-[#F4F7FA] text-[#5C6B78] hover:bg-[#E8EDF2]'
            }`}
          >
            All Layers
          </button>
          <button
            onClick={() => setActiveFilter('hazards')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
              activeFilter === 'hazards'
                ? 'bg-[#1C7293] text-white'
                : 'bg-[#F4F7FA] text-[#5C6B78] hover:bg-[#E8EDF2]'
            }`}
          >
            Risk Zones Only
          </button>
          <button
            onClick={() => setActiveFilter('sos')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
              activeFilter === 'sos'
                ? 'bg-[#D64545] text-white'
                : 'bg-[#F4F7FA] text-[#5C6B78] hover:bg-[#E8EDF2]'
            }`}
          >
            Distress Points
          </button>
        </div>
        <span className="text-[10px] text-[#5C6B78] italic hidden sm:inline">
          💡 Click map to set pin
        </span>
      </div>

      {/* Tactical Leaflet Map Container */}
      <div className="w-full h-[500px] relative overflow-hidden">
        <TacticalMap
          center={userCoords}
          zoom={14}
          userLocation={userCoords}
          riskZones={riskZones}
          sosAlerts={sosAlerts}
          patrolUnits={patrolUnits}
          filterMode={activeFilter}
          onMapClick={(lat, lng) => {
            setUserCoords([lat, lng]);
          }}
          className="w-full h-full cursor-crosshair"
        />

        {/* Floating Quick Legend */}
        <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-[#D8E0E8] shadow-md z-20 flex items-center justify-between text-[10px] font-bold">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#3FA34D]" />
            <span>Safe Corridor</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#F2A541]" />
            <span>Caution Ridge</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#D64545]" />
            <span>High Hazard</span>
          </div>
        </div>
      </div>
    </div>
  );
};
