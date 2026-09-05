import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, MapPin, Radio, Crosshair, CheckCircle2, Navigation, Loader2, Lock } from 'lucide-react';
import { useSafety } from '../../lib/safetyStore';

interface DestinationPreset {
  name: string;
  coords: [number, number];
  altitude: number;
  tag: string;
}

const DESTINATION_PRESETS: DestinationPreset[] = [
  { name: 'Manali, Himachal Pradesh', coords: [32.2432, 77.1892], altitude: 2050, tag: '🏔️ High Risk Zone' },
  { name: 'Shimla, Himachal Pradesh', coords: [31.1048, 77.1734], altitude: 2276, tag: '🌲 Mountain Corridor' },
  { name: 'Kedarnath Valley, Uttarakhand', coords: [30.7352, 79.0669], altitude: 3583, tag: '🛕 Extreme Altitude' },
  { name: 'Rishikesh, Uttarakhand', coords: [30.0869, 78.2676], altitude: 372, tag: '🌊 River Basin' },
  { name: 'Bengaluru, Karnataka', coords: [12.9716, 77.5946], altitude: 920, tag: '🏙️ Urban Center' }
];

export const TouristAuth: React.FC = () => {
  const navigate = useNavigate();
  const { loginTourist, refreshLocation, userCoords, userLocationName, userAltitude, setUserLocation } = useSafety();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('Aarav Sharma');
  const [phone, setPhone] = useState('+91 94180 22101');
  const [email, setEmail] = useState('aarav.sharma@safeyatra.in');

  // Location selection states
  const [selectedLocation, setSelectedLocation] = useState<string>(userLocationName || 'Detecting Live Location...');
  const [selectedCoords, setSelectedCoords] = useState<[number, number]>(userCoords || [12.9716, 77.5946]);
  const [selectedAltitude, setSelectedAltitude] = useState<number>(userAltitude || 920);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationLocked, setLocationLocked] = useState<boolean>(false);
  const [locationSource, setLocationSource] = useState<'gps' | 'network' | 'preset'>('preset');
  const [locationStatusMessage, setLocationStatusMessage] = useState<string>('');
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  // Fast reverse geocoding via BigDataCloud client API + Nominatim fallback
  const reverseGeocodeCoords = async (lat: number, lng: number): Promise<string> => {
    try {
      const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      if (bdcRes.ok) {
        const bdcData = await bdcRes.json();
        const city = bdcData.city || bdcData.locality || bdcData.localityInfo?.administrative?.[2]?.name;
        const region = bdcData.principalSubdivision || bdcData.countryName || '';
        if (city && region) return `${city}, ${region}`;
        if (city) return city;
        if (region) return region;
      }
    } catch {}

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        const place = address.suburb || address.town || address.village || address.city || address.county || data.display_name?.split(',')[0] || 'Current Location';
        const region = address.state || address.country || '';
        return region ? `${place}, ${region}` : place;
      }
    } catch {}

    return `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
  };

  // Instant network IP geolocation fallback (works even if device GPS is off or permission blocked)
  const fetchIPFallback = async (): Promise<{ coords: [number, number]; name: string } | null> => {
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data.success !== false && data.latitude && data.longitude) {
          const place = data.city ? `${data.city}, ${data.region || data.country}` : 'Current Location';
          return { coords: [Number(data.latitude), Number(data.longitude)], name: place };
        }
      }
    } catch {}

    try {
      const res = await fetch('https://freeipapi.com/api/json');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const place = data.cityName ? `${data.cityName}, ${data.regionName || data.countryName}` : 'Current Location';
          return { coords: [Number(data.latitude), Number(data.longitude)], name: place };
        }
      }
    } catch {}

    return null;
  };

  const handleDetectGPS = async () => {
    setIsLocating(true);
    setPermissionNotice(null);
    setLocationStatusMessage('Connecting to device GPS sensor...');

    const onGpsSuccess = async (pos: GeolocationPosition) => {
      const { latitude, longitude, altitude, accuracy } = pos.coords;
      const coords: [number, number] = [latitude, longitude];
      setSelectedCoords(coords);
      if (altitude) setSelectedAltitude(Math.round(altitude));
      if (accuracy) setLocationAccuracy(Math.round(accuracy));
      setLocationSource('gps');
      setLocationStatusMessage('Resolving exact place name...');

      const placeName = await reverseGeocodeCoords(latitude, longitude);
      setSelectedLocation(placeName);
      setLocationLocked(true);
      setIsLocating(false);
      setLocationStatusMessage('');

      setUserLocation(coords, placeName, altitude ? Math.round(altitude) : undefined);
    };

    const onGpsFailure = async (err?: GeolocationPositionError) => {
      console.warn('[GPS Detection Notice]', err?.message);
      if (err?.code === 1) {
        setPermissionNotice('GPS permission was not allowed. Automatically using Cellular/Network location.');
      } else {
        setLocationStatusMessage('Triangulating via Cellular/WiFi network...');
      }

      const netLoc = await fetchIPFallback();
      if (netLoc) {
        setSelectedCoords(netLoc.coords);
        setSelectedLocation(netLoc.name);
        setLocationSource('network');
        setLocationLocked(true);
        setIsLocating(false);
        setLocationStatusMessage('');
        setUserLocation(netLoc.coords, netLoc.name);
      } else {
        refreshLocation().then(async (coords) => {
          setSelectedCoords(coords);
          const name = await reverseGeocodeCoords(coords[0], coords[1]);
          setSelectedLocation(name);
          setLocationSource('network');
          setLocationLocked(true);
          setIsLocating(false);
          setLocationStatusMessage('');
        });
      }
    };

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      // Step 1: Rapid fix with standard accuracy (returns cellular/wifi fix in 300ms on mobile)
      navigator.geolocation.getCurrentPosition(
        onGpsSuccess,
        () => {
          // If rapid fix failed, try high accuracy with generous 15s timeout
          navigator.geolocation.getCurrentPosition(
            onGpsSuccess,
            onGpsFailure,
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 }
          );
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    } else {
      onGpsFailure();
    }
  };

  // Auto-run detection on initial load so the friend's phone detects immediately!
  useEffect(() => {
    handleDetectGPS();
  }, []);

  const handleSelectPreset = (preset: DestinationPreset) => {
    setSelectedLocation(preset.name);
    setSelectedCoords(preset.coords);
    setSelectedAltitude(preset.altitude);
    setLocationSource('preset');
    setLocationAccuracy(null);
    setPermissionNotice(null);
    setLocationLocked(true);
    setUserLocation(preset.coords, preset.name, preset.altitude);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginTourist(
      {
        name,
        phone,
        email
      },
      {
        coords: selectedCoords,
        name: selectedLocation,
        altitude: selectedAltitude
      }
    );
    navigate('/tourist');
  };

  const loadPresetUser = (presetName: string, presetPhone: string, presetDest: DestinationPreset) => {
    setName(presetName);
    setPhone(presetPhone);
    setSelectedLocation(presetDest.name);
    setSelectedCoords(presetDest.coords);
    setSelectedAltitude(presetDest.altitude);
    setLocationSource('preset');
    setLocationLocked(true);
    loginTourist(
      {
        name: presetName,
        phone: presetPhone,
        email: `${presetName.toLowerCase().replace(/\s+/g, '.')}@safeyatra.in`
      },
      {
        coords: presetDest.coords,
        name: presetDest.name,
        altitude: presetDest.altitude
      }
    );
    navigate('/tourist');
  };

  return (
    <div className="flex flex-col w-full p-4 sm:p-6 items-center justify-start min-h-[700px]">
      {/* Brand Icon Header */}
      <div className="w-14 h-14 rounded-2xl bg-[#0B3D62] text-white flex items-center justify-center mb-3 shadow-md">
        <ShieldCheck className="w-8 h-8 text-cyan-300" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-[11px] font-extrabold mb-2">
        <Lock className="w-3.5 h-3.5 text-amber-600" />
        <span>Login Compulsory For All Users</span>
      </div>

      <h2 className="text-xl font-extrabold text-[#0B3D62] text-center">
        SafeYatra Tourist Companion
      </h2>
      <p className="text-xs text-[#5C6B78] text-center max-w-xs mt-1 mb-5">
        Verification and live GPS authorization are required to access real-time 112 SOS and search-and-rescue dispatch.
      </p>

      {/* Auth Mode Toggle */}
      <div className="w-full max-w-sm p-1 rounded-xl bg-[#E8EDF2] flex items-center mb-4">
        <button
          type="button"
          onClick={() => setIsRegister(false)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            !isRegister ? 'bg-white text-[#0B3D62] shadow-sm' : 'text-[#5C6B78]'
          }`}
        >
          Tourist Login
        </button>
        <button
          type="button"
          onClick={() => setIsRegister(true)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            isRegister ? 'bg-white text-[#0B3D62] shadow-sm' : 'text-[#5C6B78]'
          }`}
        >
          Express Registration
        </button>
      </div>

      {/* Auth & Location Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm mt-4 space-y-3.5">
        {/* Tourist Identity */}
        <div>
          <label className="text-[10px] font-bold text-[#5C6B78] uppercase tracking-wider block mb-1">
            Full Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aarav Sharma"
            className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] text-xs font-semibold focus:outline-none focus:border-[#1C7293]"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-[#5C6B78] uppercase tracking-wider block mb-1">
            Emergency Mobile Number (112 Tracking)
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 94180 22101"
            className="w-full p-2.5 rounded-xl bg-[#F4F7FA] border border-[#D8E0E8] text-xs font-semibold focus:outline-none focus:border-[#1C7293]"
          />
        </div>

        {/* LOCATION SETUP CLUSTER */}
        <div className="pt-2 border-t border-[#E8EDF2]">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-extrabold text-[#0B3D62] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#1C7293]" />
              <span>Current Travel Location / GPS</span>
            </label>
            <span className="text-[10px] text-emerald-600 font-bold">Required</span>
          </div>

          {/* Detect Live GPS Button */}
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isLocating}
            className="w-full py-2.5 px-3 rounded-xl bg-[#002743] hover:bg-[#0B3D62] text-cyan-200 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                <span>{locationStatusMessage || 'Acquiring Live Coordinates...'}</span>
              </>
            ) : (
              <>
                <Crosshair className="w-4 h-4 text-emerald-400" />
                <span>Detect Live GPS / Refresh Location</span>
              </>
            )}
          </button>

          {/* Optional Permission / Cellular Notice */}
          {permissionNotice && (
            <div className="mt-2 p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-[11px] text-sky-900 flex items-start gap-2 shadow-xs">
              <span className="shrink-0 text-sm">ℹ️</span>
              <span className="leading-snug">{permissionNotice}</span>
            </div>
          )}

          {/* Location Status Badge */}
          {locationLocked && (
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-2.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-extrabold text-emerald-950 leading-tight">
                    {selectedLocation}
                  </p>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 shrink-0 ml-1">
                    {locationSource === 'gps' ? '🛰️ Hardware GPS' : locationSource === 'network' ? '📶 Cellular / IP' : '📍 Preset'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-emerald-700 font-mono">
                  <span>{selectedCoords[0].toFixed(4)}°N, {selectedCoords[1].toFixed(4)}°E</span>
                  <span>•</span>
                  <span>{selectedAltitude}m Alt</span>
                  {locationAccuracy && <span>• ±{locationAccuracy}m</span>}
                </div>
              </div>
            </div>
          )}

          {/* Quick Destination Selectors */}
          <div className="mt-2.5">
            <span className="text-[10px] font-semibold text-[#5C6B78] block mb-1.5">
              Or pick travel destination zone:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DESTINATION_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                    selectedLocation === preset.name
                      ? 'bg-[#1C7293] text-white border-[#1C7293] shadow-sm'
                      : 'bg-white text-[#5C6B78] border-[#D8E0E8] hover:border-[#1C7293]'
                  }`}
                >
                  {preset.name.split(',')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-[#0B3D62] hover:bg-[#134B73] text-white text-xs font-extrabold transition-colors flex items-center justify-center gap-2 shadow-md mt-4"
        >
          <span>Confirm Location & Enter Safety Deck</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* One-Tap Demo Profiles for Fast Video Recording */}
      <div className="w-full max-w-sm mt-5 pt-3 border-t border-[#E8EDF2]">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5C6B78] block mb-2 text-center">
          ⚡ One-Tap Demo Logins (Video Ready)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => loadPresetUser('Aarav Sharma', '+91 94180 22101', DESTINATION_PRESETS[0])}
            className="p-2.5 rounded-xl bg-white border border-[#D8E0E8] text-left hover:border-[#1C7293] transition-colors shadow-sm"
          >
            <span className="font-bold text-[#0B3D62] text-xs block truncate">Aarav Sharma</span>
            <span className="text-[10px] text-emerald-600 font-semibold block truncate">📍 Manali, HP</span>
            <span className="text-[9px] text-[#5C6B78] block">Solo Trekker</span>
          </button>

          <button
            type="button"
            onClick={() => loadPresetUser('Priya Sharma', '+91 98112 40912', DESTINATION_PRESETS[1])}
            className="p-2.5 rounded-xl bg-white border border-[#D8E0E8] text-left hover:border-[#1C7293] transition-colors shadow-sm"
          >
            <span className="font-bold text-[#D64545] text-xs block truncate">Priya Sharma</span>
            <span className="text-[10px] text-emerald-600 font-semibold block truncate">📍 Shimla, HP</span>
            <span className="text-[9px] text-[#5C6B78] block">High-Risk Watch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
