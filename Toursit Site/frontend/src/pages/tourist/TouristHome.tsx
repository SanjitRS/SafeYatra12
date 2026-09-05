import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertTriangle, 
  QrCode, 
  FileWarning, 
  PhoneCall, 
  Map, 
  Navigation, 
  ShieldAlert, 
  ChevronRight,
  Crosshair,
  HeartPulse,
  LogOut,
  Globe,
  MapPin,
  Loader2
} from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';

export const TouristHome: React.FC = () => {
  const navigate = useNavigate();
  const { 
    tourist, 
    activeTouristSos, 
    triggerTouristSos, 
    userCoords, 
    userLocationName, 
    userAltitude, 
    isLiveGps, 
    refreshLocation,
    logoutTourist,
    setUserLocation,
    isLoggedIn 
  } = useSafety();

  const [isLocating, setIsLocating] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

  const handleQuickGps = async () => {
    setIsLocating(true);
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude, altitude } = pos.coords;
            setUserLocation([latitude, longitude], `${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`, altitude ? Math.round(altitude) : undefined);
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`);
              if (res.ok) {
                const data = await res.json();
                const place = data.address?.suburb || data.address?.town || data.address?.city || data.display_name?.split(',')[0] || 'Current Location';
                const region = data.address?.state || '';
                setUserLocation([latitude, longitude], region ? `${place}, ${region}` : place, altitude ? Math.round(altitude) : undefined);
              }
            } catch {}
            setIsLocating(false);
            setLocationConfirmed(true);
          },
          (err) => {
            console.warn('[GPS Detection Error]', err);
            setIsLocating(false);
            refreshLocation().then(() => setLocationConfirmed(true));
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        await refreshLocation();
        setIsLocating(false);
        setLocationConfirmed(true);
      }
    } catch {
      setIsLocating(false);
    }
  };

  const handleSelectPresetCity = (name: string, coords: [number, number], alt: number) => {
    setUserLocation(coords, name, alt);
    setLocationConfirmed(true);
  };

  // Hold-to-activate state for tactile thumb-zone SOS button
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startHold = () => {
    if (activeTouristSos) {
      navigate('/tourist/sos');
      return;
    }

    setHolding(true);
    setHoldProgress(0);

    const stepMs = 40;
    const totalDurationMs = 1800; // 1.8s hold
    const increment = (stepMs / totalDurationMs) * 100;

    holdIntervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
          setHolding(false);
          triggerTouristSos('Hold-to-trigger SOS Panic Button pressed');
          navigate('/tourist/sos');
          return 100;
        }
        return next;
      });
    }, stepMs);
  };

  const endHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHolding(false);
    setHoldProgress(0);
  };

  // SVG circle calculations for progress ring
  const circleRadius = 48;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (holdProgress / 100) * circumference;

  const isPublicUser = tourist.name.toLowerCase().includes('public');

  return (
    <div className="flex flex-col w-full pb-6">
      {/* Top Welcome Header */}
      <div className="bg-[#0B3D62] text-white px-5 pt-4 pb-6 rounded-b-[28px] shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full ${isPublicUser ? 'bg-emerald-600' : 'bg-[#1C7293]'} flex items-center justify-center text-white font-extrabold text-lg shadow-inner`}>
              {isPublicUser ? (
                <Globe className="w-5 h-5 text-white" />
              ) : (
                tourist.name.charAt(0)
              )}
            </div>
            <div>
              <span className="text-[11px] text-cyan-200 uppercase tracking-wider font-semibold block">
                {isPublicUser ? 'Public Safety Deck' : 'Tourist Safety Profile'}
              </span>
              <h2 className="text-lg font-bold text-white leading-tight">
                Namaste, {tourist.name.split(' ')[0]}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/tourist/id')}
              className="w-9 h-9 rounded-full bg-[#002743]/80 hover:bg-[#1C7293] flex items-center justify-center text-cyan-200 transition-colors border border-cyan-400/20 shadow-sm"
              title="Open Digital ID"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={() => logoutTourist()}
              className="w-9 h-9 rounded-full bg-[#002743]/80 hover:bg-red-900/80 hover:text-red-300 flex items-center justify-center text-cyan-200 transition-colors border border-cyan-400/20 shadow-sm"
              title="Log Out (Compulsory Login)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* GPS Coordinates Bar */}
        <div 
          onClick={() => refreshLocation()}
          className="flex items-center justify-between bg-[#002743]/70 rounded-xl px-3 py-2 text-xs backdrop-blur-sm relative z-10 border border-cyan-500/20 cursor-pointer hover:bg-[#002743]/90 transition-colors"
          title="Tap to refresh live GPS position"
        >
          <div className="flex items-center gap-1.5 text-cyan-200 font-medium truncate max-w-[75%]">
            <Crosshair className={`w-3.5 h-3.5 text-cyan-400 shrink-0 ${isLiveGps ? 'animate-pulse' : ''}`} />
            <span className="truncate">
              GPS: {userLocationName || `${userCoords[0].toFixed(4)}°N, ${userCoords[1].toFixed(4)}°E`}
            </span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{isLiveGps ? 'Live Device' : 'Active Grid'}</span>
          </div>
        </div>
      </div>

      {/* Public Safety & Location Quick Calibration Card */}
      <div className="px-4 mt-3 relative z-20">
        <div className="bg-gradient-to-br from-[#0B3D62] to-[#134B73] rounded-2xl p-3.5 text-white shadow-md border border-cyan-500/30">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold text-cyan-100 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Emergency Rescue Grid Location
              </span>
            </div>
            {locationConfirmed && (
              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                ✓ Locked
              </span>
            )}
          </div>

          <p className="text-[11px] text-cyan-100/90 leading-snug mb-2.5">
            SafeYatra transmits your exact location coordinates during SOS to 112 search-and-rescue dispatchers.
          </p>

          <div className="flex items-center gap-2 mb-2.5">
            <button
              type="button"
              onClick={handleQuickGps}
              disabled={isLocating}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Detecting GPS Coordinates...</span>
                </>
              ) : (
                <>
                  <Crosshair className="w-3.5 h-3.5 text-slate-950" />
                  <span>Detect My Live GPS</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Destination Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="text-[10px] text-cyan-300 font-semibold shrink-0">Preset:</span>
            {[
              { name: 'Manali, HP', coords: [32.2432, 77.1892] as [number, number], alt: 2050 },
              { name: 'Shimla, HP', coords: [31.1048, 77.1734] as [number, number], alt: 2276 },
              { name: 'Kedarnath', coords: [30.7352, 79.0669] as [number, number], alt: 3583 },
              { name: 'Rishikesh', coords: [30.0869, 78.2676] as [number, number], alt: 372 },
              { name: 'Bengaluru', coords: [12.9716, 77.5946] as [number, number], alt: 920 }
            ].map((city) => (
              <button
                key={city.name}
                type="button"
                onClick={() => handleSelectPresetCity(city.name, city.coords, city.alt)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-colors border ${
                  userLocationName?.includes(city.name.split(',')[0])
                    ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-sm'
                    : 'bg-white/10 text-cyan-200 border-white/10 hover:bg-white/20'
                }`}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Safety Status Card at a Glance (Overlapping Header) */}
      <div className="px-4 -mt-3 relative z-20">
        <div className="bg-white rounded-2xl p-4 shadow-md border border-[#D8E0E8] flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#F2A541]/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-[#F2A541]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-[#F2A541] tracking-wide">
                Safety Grid Advisory
              </span>
              <span className="text-[11px] font-semibold text-[#5C6B78]">{userAltitude}m ASL</span>
            </div>
            <p className="text-xs text-[#1A2530] mt-1 leading-relaxed">
              SafeYatra high-precision geofencing active. Real-time telemetry is synced with State Disaster Management & 112 Emergency Dispatch.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Safety Directory Motif (Icons inside soft colored circles) */}
      <div className="px-4 mt-5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6B78] block mb-2.5">
          Quick Safety Directory
        </span>
        <div className="grid grid-cols-4 gap-2.5">
          <button
            onClick={() => navigate('/tourist/id')}
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white border border-[#E8EDF2] shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-[#1C7293]/15 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <QrCode className="w-5 h-5 text-[#1C7293]" />
            </div>
            <span className="text-[11px] font-bold text-[#1A2530] text-center leading-tight">Digital ID</span>
          </button>

          <button
            onClick={() => navigate('/tourist/report')}
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white border border-[#E8EDF2] shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-[#F2A541]/20 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <FileWarning className="w-5 h-5 text-[#F2A541]" />
            </div>
            <span className="text-[11px] font-bold text-[#1A2530] text-center leading-tight">Report Trail</span>
          </button>

          <button
            onClick={() => navigate('/tourist/resources')}
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white border border-[#E8EDF2] shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-[#D64545]/15 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <PhoneCall className="w-5 h-5 text-[#D64545]" />
            </div>
            <span className="text-[11px] font-bold text-[#1A2530] text-center leading-tight">112 Hub</span>
          </button>

          <button
            onClick={() => navigate('/tourist/map')}
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-white border border-[#E8EDF2] shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-11 h-11 rounded-full bg-[#3FA34D]/15 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
              <Map className="w-5 h-5 text-[#3FA34D]" />
            </div>
            <span className="text-[11px] font-bold text-[#1A2530] text-center leading-tight">Safe Map</span>
          </button>
        </div>
      </div>

      {/* Nearest Safe Haven Card */}
      <div className="px-4 mt-4">
        <div 
          onClick={() => navigate('/tourist/map')}
          className="bg-white rounded-2xl p-3.5 border border-[#E8EDF2] shadow-sm flex items-center justify-between cursor-pointer hover:border-[#1C7293] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0B3D62]/10 flex items-center justify-center text-[#0B3D62] shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#1C7293]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase text-[#1C7293]">Nearest Safe Haven</span>
                <span className="text-[10px] text-[#5C6B78] font-bold">• 420m away</span>
              </div>
              <h4 className="text-sm font-bold text-[#1A2530] truncate mt-0.5">
                Mall Road Municipal Police Outpost
              </h4>
              <p className="text-[11px] text-[#5C6B78] truncate">
                Paramedic on duty • Multilingual Tourism Desk
              </p>
            </div>
          </div>
          <Navigation className="w-5 h-5 text-[#1C7293] shrink-0 ml-2" />
        </div>
      </div>

      {/* PERSISTENT THUMB-ZONE SOS TRIGGER */}
      <div className="px-4 mt-6 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Ambient Glow */}
          <div className={`absolute w-36 h-36 rounded-full ${holding ? 'bg-red-500/30 animate-ping' : 'bg-[#D64545]/15 animate-pulse'}`} />

          {/* SOS Circular Button with Hold Ring */}
          <button
            onMouseDown={startHold}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={startHold}
            onTouchEnd={endHold}
            className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center select-none shadow-xl transition-transform active:scale-95 focus:outline-none ${
              activeTouristSos
                ? 'bg-[#0B3D62] text-white'
                : 'bg-[#D64545] text-white hover:bg-red-700'
            }`}
          >
            {/* SVG Progress Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
              <circle
                cx="56"
                cy="56"
                r={circleRadius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="4"
              />
              <circle
                cx="56"
                cy="56"
                r={circleRadius}
                fill="none"
                stroke="#F2A541"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-75"
              />
            </svg>

            <ShieldAlert className="w-8 h-8 mb-1" />
            <span className="font-extrabold text-sm tracking-wider leading-none">
              {activeTouristSos ? 'VIEW SOS' : holding ? 'HOLD...' : 'SOS'}
            </span>
            <span className="text-[9px] font-semibold text-white/80 mt-1 uppercase">
              {activeTouristSos ? 'ACTIVE DISPATCH' : 'HOLD 2 SEC'}
            </span>
          </button>
        </div>

        <p className="text-[11px] text-[#D64545] font-bold text-center mt-3 flex items-center justify-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#D64545] animate-ping" />
          Auto-notifies Emergency Dispatch & 112 Command Grid
        </p>
      </div>

      {/* Instant Emergency Speed Dials (<3s reachable) */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6B78]">
            Instant Speed Dials (&lt;3s)
          </span>
          <span className="text-[10px] font-bold text-[#1C7293]">24x7 Monitored</span>
        </div>

        <div className="space-y-2">
          <a
            href="tel:112"
            className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E8EDF2] hover:bg-[#F4F7FA] transition-colors shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#D64545]/15 flex items-center justify-center text-[#D64545]">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#1A2530] block">National Emergency (All in One)</span>
                <span className="text-[10px] text-[#5C6B78]">Police • Ambulance • Fire</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#D64545]/10 text-[#D64545] font-extrabold text-xs">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>112</span>
            </div>
          </a>

          <a
            href="tel:1363"
            className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E8EDF2] hover:bg-[#F4F7FA] transition-colors shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1C7293]/15 flex items-center justify-center text-[#1C7293]">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#1A2530] block">Incredible India 24x7 Tourist Helpline</span>
                <span className="text-[10px] text-[#5C6B78]">Ministry of Tourism, Govt. of India (12 Languages)</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C7293]/10 text-[#1C7293] font-extrabold text-xs">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>1363</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};
