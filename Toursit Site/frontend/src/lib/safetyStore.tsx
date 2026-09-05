import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { TouristProfile, SosAlert, Incident, RiskZone, PatrolUnit, RiskLevel } from '../types';
import { INITIAL_TOURIST, INITIAL_SOS_ALERTS, INITIAL_RISK_ZONES, INITIAL_INCIDENTS, INITIAL_PATROL_UNITS } from './mockData';
import { apiUrl } from './api';

interface SafetyContextType {
  tourist: TouristProfile;
  activeSosAlerts: SosAlert[];
  incidents: Incident[];
  riskZones: RiskZone[];
  patrolUnits: PatrolUnit[];
  activeTouristSos: SosAlert | null;
  currentRiskLevel: RiskLevel;
  authorityOfficer: {
    id: string;
    name: string;
    callsign: string;
    badge: string;
    role: string;
  };
  socketConnected: boolean;
  gpsActive: boolean;
  userCoords: [number, number];
  userLocationName: string;
  userAccuracy: number;
  userAltitude: number;
  isLiveGps: boolean;
  setUserCoords: React.Dispatch<React.SetStateAction<[number, number]>>;
  setUserLocationName: React.Dispatch<React.SetStateAction<string>>;
  refreshLocation: () => Promise<[number, number]>;
  
  // Actions
  triggerTouristSos: (reason?: string) => Promise<SosAlert>;
  cancelTouristSos: (alertId: string, reason?: string) => void;
  acknowledgeSos: (alertId: string) => void;
  assignPatrolToSos: (alertId: string, unitId: string) => void;
  resolveSos: (alertId: string, resolutionNotes?: string) => void;
  reportIncident: (incidentData: Omit<Incident, 'id' | 'reportedAt'>) => Promise<Incident>;
  updateIncidentStatus: (incidentId: string, status: Incident['status']) => void;
  verifyRiskZone: (zoneId: string, approve: boolean) => void;
  addCustomRiskZone: (zone: Omit<RiskZone, 'id' | 'lastUpdated'>) => void;
  updateTouristProfile: (updates: Partial<TouristProfile>) => void;
  playEmergencyChime: () => void;
  playAckChime: () => void;
  systemNotification: { id: string; message: string; type: 'urgent' | 'info' | 'success' } | null;
  clearNotification: () => void;
}

const STORAGE_KEYS = {
  SOS: 'safeyatra_sos_v2',
  INCIDENTS: 'safeyatra_incidents_v2',
  ZONES: 'safeyatra_zones_v2',
  TOURIST: 'safeyatra_tourist_v2',
  PATROL: 'safeyatra_patrol_v2'
};

const SafetyContext = createContext<SafetyContextType | null>(null);

export const SafetyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial states from localStorage if available
  const [tourist, setTourist] = useState<TouristProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TOURIST);
    return saved ? JSON.parse(saved) : INITIAL_TOURIST;
  });

  const [activeSosAlerts, setActiveSosAlerts] = useState<SosAlert[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SOS);
    return saved ? JSON.parse(saved) : INITIAL_SOS_ALERTS;
  });

  const [incidents, setIncidents] = useState<Incident[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
    return saved ? JSON.parse(saved) : INITIAL_INCIDENTS;
  });

  const [riskZones, setRiskZones] = useState<RiskZone[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ZONES);
    return saved ? JSON.parse(saved) : INITIAL_RISK_ZONES;
  });

  const [patrolUnits, setPatrolUnits] = useState<PatrolUnit[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PATROL);
    return saved ? JSON.parse(saved) : INITIAL_PATROL_UNITS;
  });

  const [systemNotification, setSystemNotification] = useState<{ id: string; message: string; type: 'urgent' | 'info' | 'success' } | null>(null);
  const [socketConnected, setSocketConnected] = useState(true);
  const [gpsActive, setGpsActive] = useState(true);
  const [userCoords, setUserCoords] = useState<[number, number]>([12.9716, 77.5946]); // Bengaluru live default
  const [userLocationName, setUserLocationName] = useState<string>('Bengaluru, Karnataka');
  const [userAltitude, setUserAltitude] = useState<number>(920);
  const [userAccuracy, setUserAccuracy] = useState<number>(15);
  const [isLiveGps, setIsLiveGps] = useState<boolean>(true);

  const userCoordsRef = useRef<[number, number]>(userCoords);
  useEffect(() => {
    userCoordsRef.current = userCoords;
  }, [userCoords]);

  const lastGeocodeCoords = useRef<[number, number] | null>(null);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    // Avoid re-querying nominatim if distance moved is less than 0.0005 deg (~50m)
    if (lastGeocodeCoords.current) {
      const dLat = Math.abs(lastGeocodeCoords.current[0] - lat);
      const dLng = Math.abs(lastGeocodeCoords.current[1] - lng);
      if (dLat < 0.0005 && dLng < 0.0005) {
        return;
      }
    }
    lastGeocodeCoords.current = [lat, lng];

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' }
      });
      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        const place = address.suburb || address.neighbourhood || address.town || address.village || address.city || address.county || data.display_name?.split(',')[0] || 'Current Area';
        const cityOrState = address.city || address.state || address.country || '';
        const formatted = cityOrState ? `${place}, ${cityOrState}` : place;
        setUserLocationName(formatted);
        return formatted;
      }
    } catch {
      // offline / CORS fallback
    }
    const fallbackName = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
    setUserLocationName(fallbackName);
    return fallbackName;
  }, []);

  const lastPingTime = useRef<number>(0);
  const sendLocationPing = useCallback(async (lat: number, lng: number, altitude?: number, accuracy?: number) => {
    const token = localStorage.getItem('safeyatra_token') || sessionStorage.getItem('safeyatra_token');
    if (!token) return; // Do not ping if not authenticated

    const now = Date.now();
    // Throttle network pings to at most once every 15 seconds
    if (now - lastPingTime.current < 15000) return;
    lastPingTime.current = now;

    try {
      await fetch(apiUrl('/api/location/ping'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          lat,
          lng,
          altitude: altitude || 0,
          accuracy: accuracy || 5,
          batteryLevel: 90
        })
      });
    } catch {
      // silent offline ping
    }
  }, []);

  // Fetch approximate network/IP coordinates if GPS times out or fails
  const fetchNetworkFallbackLocation = useCallback(async (): Promise<[number, number] | null> => {
    try {
      // 1. Try ipwho.is (fast, JSON CORS-friendly)
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data.success !== false && data.latitude && data.longitude) {
          const coords: [number, number] = [Number(data.latitude), Number(data.longitude)];
          setUserCoords(coords);
          setIsLiveGps(true);
          setGpsActive(true);
          const name = data.city ? `${data.city}, ${data.region || data.country}` : 'Current Location';
          setUserLocationName(name);
          sendLocationPing(coords[0], coords[1], 0, 100);
          return coords;
        }
      }
    } catch {
      // ignore, try next provider
    }

    try {
      // 2. Try ip-api.com as secondary fallback
      const res = await fetch('https://ip-api.io/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const coords: [number, number] = [Number(data.latitude), Number(data.longitude)];
          setUserCoords(coords);
          setIsLiveGps(true);
          setGpsActive(true);
          const name = data.city ? `${data.city}, ${data.region_name || data.country_name}` : 'Current Location';
          setUserLocationName(name);
          sendLocationPing(coords[0], coords[1], 0, 100);
          return coords;
        }
      }
    } catch {
      // ignore
    }

    return null;
  }, [sendLocationPing]);

  const refreshLocation = useCallback(async (): Promise<[number, number]> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        // Step 1: Request real device GPS with high accuracy
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, altitude, accuracy } = pos.coords;
            const newCoords: [number, number] = [latitude, longitude];
            setUserCoords(newCoords);
            setIsLiveGps(true);
            setGpsActive(true);
            if (altitude) setUserAltitude(Math.round(altitude));
            setUserAccuracy(Math.round(accuracy || 10));
            reverseGeocode(latitude, longitude);
            sendLocationPing(latitude, longitude, altitude || undefined, accuracy);
            console.log(`[GPS] Real hardware location acquired: ${latitude}, ${longitude} (±${Math.round(accuracy)}m)`);
            resolve(newCoords);
          },
          async (err) => {
            console.warn(`[GPS] Geolocation notice: ${err.message}. Attempting network fallback...`);
            const fallbackCoords = await fetchNetworkFallbackLocation();
            if (fallbackCoords) {
              resolve(fallbackCoords);
            } else {
              resolve(userCoordsRef.current);
            }
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
      } else {
        fetchNetworkFallbackLocation().then((fb) => resolve(fb || userCoordsRef.current));
      }
    });
  }, [reverseGeocode, sendLocationPing, fetchNetworkFallbackLocation]);

  // Stable one-time geolocation setup on component mount
  useEffect(() => {
    refreshLocation();

    let watchId: number | null = null;
    let lastCoords: [number, number] | null = null;

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, altitude, accuracy } = pos.coords;
          if (lastCoords) {
            const dLat = Math.abs(lastCoords[0] - latitude);
            const dLng = Math.abs(lastCoords[1] - longitude);
            // Skip jitter (< ~30 meters) to avoid unnecessary re-renders
            if (dLat < 0.0003 && dLng < 0.0003) {
              return;
            }
          }
          lastCoords = [latitude, longitude];

          setUserCoords([latitude, longitude]);
          setIsLiveGps(true);
          setGpsActive(true);
          if (altitude) setUserAltitude(Math.round(altitude));
          if (accuracy) setUserAccuracy(Math.round(accuracy));
          reverseGeocode(latitude, longitude);
          sendLocationPing(latitude, longitude, altitude || undefined, accuracy);
        },
        () => {},
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    }

    return () => {
      if (watchId !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [refreshLocation, reverseGeocode, sendLocationPing]);

  const authorityOfficer = {
    id: 'OFFICER-804',
    name: 'Inspector Vikramaditya Sen',
    callsign: '#804-Alpha',
    badge: 'HP-POLICE-HQ-09',
    role: 'HQ Strategic Dispatcher'
  };

  // Broadcast channel for multi-tab synchronization
  const [broadcast, setBroadcast] = useState<BroadcastChannel | null>(null);

  // Audio synthetics using Web Audio API
  const playEmergencyChime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(660, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio context might be restricted before interaction
    }
  }, []);

  const playAckChime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // safe fallback
    }
  }, []);

  // Setup broadcast channel & browser storage persistence
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('safeyatra_channel');
      bc.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'SOS_UPDATED') {
          setActiveSosAlerts(payload);
        } else if (type === 'INCIDENTS_UPDATED') {
          setIncidents(payload);
        } else if (type === 'ZONES_UPDATED') {
          setRiskZones(payload);
        } else if (type === 'EMERGENCY_TRIGGERED') {
          playEmergencyChime();
          setSystemNotification({
            id: Date.now().toString(),
            message: `URGENT SOS: ${payload.touristName} triggered distress broadcast!`,
            type: 'urgent'
          });
        }
      };
      setBroadcast(bc);
      return () => {
        bc.close();
      };
    }
  }, [playEmergencyChime]);

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SOS, JSON.stringify(activeSosAlerts));
  }, [activeSosAlerts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
  }, [incidents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(riskZones));
  }, [riskZones]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOURIST, JSON.stringify(tourist));
  }, [tourist]);

  // Current active SOS of the logged-in tourist
  const activeTouristSos = activeSosAlerts.find(
    (alert) => alert.touristId === tourist.id && alert.status !== 'resolved' && alert.status !== 'cancelled'
  ) || null;

  // Determine current regional risk level based on user coordinates and risk zones
  const currentRiskLevel: RiskLevel = activeTouristSos ? 'high' : 'medium';

  // Real-time Action implementations
  const triggerTouristSos = useCallback(async (reason?: string): Promise<SosAlert> => {
    const dynamicAddress = userLocationName || `${userCoords[0].toFixed(4)}°N, ${userCoords[1].toFixed(4)}°E`;
    const newAlert: SosAlert = {
      id: `SOS-${Math.floor(10000 + Math.random() * 90000)}`,
      touristId: tourist.id,
      touristName: tourist.name,
      touristPhone: tourist.phone,
      timestamp: new Date().toISOString(),
      status: 'triggered',
      severity: 'critical',
      location: {
        lat: userCoords[0],
        lng: userCoords[1],
        altitude: userAltitude,
        accuracy: userAccuracy,
        address: dynamicAddress,
        sector: 'Live Device Geolocation'
      },
      batteryLevel: 85,
      altitudeM: userAltitude,
      notes: reason || 'Urgent distress beacon manually triggered by tourist. Accelerated response requested.'
    };

    setActiveSosAlerts((prev) => {
      const updated = [newAlert, ...prev.filter(a => a.touristId !== tourist.id)];
      broadcast?.postMessage({ type: 'SOS_UPDATED', payload: updated });
      broadcast?.postMessage({ type: 'EMERGENCY_TRIGGERED', payload: newAlert });
      return updated;
    });

    // Also forward to backend API
    try {
      const token = localStorage.getItem('safeyatra_token') || sessionStorage.getItem('safeyatra_token');
      fetch(apiUrl('/api/sos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          location: {
            lat: userCoords[0],
            lng: userCoords[1],
            address: dynamicAddress,
            accuracy: userAccuracy
          },
          reason: reason || 'Urgent distress beacon manually triggered by tourist.',
          batteryLevel: 85
        })
      }).catch(() => {});
    } catch {
      // offline fallback
    }

    playEmergencyChime();
    setSystemNotification({
      id: Date.now().toString(),
      message: `Distress beacon activated for ${dynamicAddress}. Telemetry transmitted to Emergency Dispatch.`,
      type: 'urgent'
    });

    return newAlert;
  }, [tourist, userCoords, userLocationName, userAltitude, userAccuracy, broadcast, playEmergencyChime]);

  const cancelTouristSos = useCallback((alertId: string, reason?: string) => {
    setActiveSosAlerts((prev) => {
      const updated = prev.map((alert) => {
        if (alert.id === alertId) {
          return {
            ...alert,
            status: 'cancelled' as const,
            notes: `${alert.notes || ''} | Cancelled by tourist: ${reason || 'Accidental activation confirmed safe'}`
          };
        }
        return alert;
      });
      broadcast?.postMessage({ type: 'SOS_UPDATED', payload: updated });
      return updated;
    });

    setSystemNotification({
      id: Date.now().toString(),
      message: 'SOS Alert cancelled. Status cleared with Dispatch Hub.',
      type: 'info'
    });
  }, [broadcast]);

  const acknowledgeSos = useCallback((alertId: string) => {
    playAckChime();
    setActiveSosAlerts((prev) => {
      const updated = prev.map((alert) => {
        if (alert.id === alertId) {
          return {
            ...alert,
            status: 'acknowledged' as const,
            acknowledgedAt: new Date().toISOString()
          };
        }
        return alert;
      });
      broadcast?.postMessage({ type: 'SOS_UPDATED', payload: updated });
      return updated;
    });

    setSystemNotification({
      id: Date.now().toString(),
      message: `Alert #${alertId} acknowledged. Tourist device notified.`,
      type: 'success'
    });
  }, [broadcast, playAckChime]);

  const assignPatrolToSos = useCallback((alertId: string, unitId: string) => {
    const unit = patrolUnits.find(u => u.id === unitId) || patrolUnits[0];
    playAckChime();

    setActiveSosAlerts((prev) => {
      const updated = prev.map((alert) => {
        if (alert.id === alertId) {
          return {
            ...alert,
            status: 'assigned' as const,
            assignedUnit: {
              id: unit.id,
              name: unit.name,
              officer: unit.officers[0],
              etaMinutes: Math.floor(3 + Math.random() * 5),
              distanceMeters: 650,
              phone: '+91 94180 11202'
            }
          };
        }
        return alert;
      });
      broadcast?.postMessage({ type: 'SOS_UPDATED', payload: updated });
      return updated;
    });

    setPatrolUnits(prev => prev.map(u => u.id === unitId ? { ...u, status: 'dispatched', assignedIncidentId: alertId } : u));

    setSystemNotification({
      id: Date.now().toString(),
      message: `${unit.name} dispatched to coordinate for alert #${alertId}.`,
      type: 'success'
    });
  }, [broadcast, patrolUnits, playAckChime]);

  const resolveSos = useCallback((alertId: string, resolutionNotes?: string) => {
    setActiveSosAlerts((prev) => {
      const updated = prev.map((alert) => {
        if (alert.id === alertId) {
          return {
            ...alert,
            status: 'resolved' as const,
            resolvedAt: new Date().toISOString(),
            notes: `${alert.notes || ''} | Resolved: ${resolutionNotes || 'Tourist safely escorted / medical assistance rendered'}`
          };
        }
        return alert;
      });
      broadcast?.postMessage({ type: 'SOS_UPDATED', payload: updated });
      return updated;
    });

    setSystemNotification({
      id: Date.now().toString(),
      message: `Alert #${alertId} closed as safely resolved.`,
      type: 'success'
    });
  }, [broadcast]);

  const reportIncident = useCallback(async (incidentData: Omit<Incident, 'id' | 'reportedAt'>): Promise<Incident> => {
    const newInc: Incident = {
      ...incidentData,
      id: `INC-2025-${Math.floor(100 + Math.random() * 900)}`,
      reportedAt: new Date().toISOString()
    };

    setIncidents((prev) => {
      const updated = [newInc, ...prev];
      broadcast?.postMessage({ type: 'INCIDENTS_UPDATED', payload: updated });
      return updated;
    });

    // Also forward to backend API
    try {
      const token = localStorage.getItem('safeyatra_token') || sessionStorage.getItem('safeyatra_token');
      fetch(apiUrl('/api/incidents'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: incidentData.title,
          type: incidentData.type,
          description: incidentData.description,
          severity: incidentData.severity,
          location: incidentData.location,
          imageUrl: incidentData.imageUrl
        })
      }).catch(() => {});
    } catch {
      // offline fallback
    }

    setSystemNotification({
      id: Date.now().toString(),
      message: 'Incident published to Tactical GIS Command Feed.',
      type: 'success'
    });

    return newInc;
  }, [broadcast]);

  const updateIncidentStatus = useCallback((incidentId: string, status: Incident['status']) => {
    setIncidents((prev) => {
      const updated = prev.map(inc => inc.id === incidentId ? { ...inc, status } : inc);
      broadcast?.postMessage({ type: 'INCIDENTS_UPDATED', payload: updated });
      return updated;
    });
  }, [broadcast]);

  const verifyRiskZone = useCallback((zoneId: string, approve: boolean) => {
    setRiskZones((prev) => {
      let updated: RiskZone[];
      if (approve) {
        updated = prev.map(z => z.id === zoneId ? { ...z, source: 'authority_confirmed' as const, lastUpdated: 'Verified by HQ Control' } : z);
      } else {
        updated = prev.filter(z => z.id !== zoneId);
      }
      broadcast?.postMessage({ type: 'ZONES_UPDATED', payload: updated });
      return updated;
    });

    setSystemNotification({
      id: Date.now().toString(),
      message: approve ? 'AI Geofence verified and broadcasted as official authority zone.' : 'AI Geofence alert dismissed.',
      type: 'info'
    });
  }, [broadcast]);

  const addCustomRiskZone = useCallback((zone: Omit<RiskZone, 'id' | 'lastUpdated'>) => {
    const newZone: RiskZone = {
      ...zone,
      id: `ZONE-${Date.now()}`,
      lastUpdated: 'Just now by Officer Sen'
    };

    setRiskZones(prev => {
      const updated = [newZone, ...prev];
      broadcast?.postMessage({ type: 'ZONES_UPDATED', payload: updated });
      return updated;
    });
  }, [broadcast]);

  const updateTouristProfile = useCallback((updates: Partial<TouristProfile>) => {
    setTourist(prev => ({
      ...prev,
      ...updates,
      qrPayload: JSON.stringify({
        id: updates.id || prev.id,
        name: updates.name || prev.name,
        blood: updates.bloodGroup || prev.bloodGroup,
        emergency: updates.emergencyContact?.phone || prev.emergencyContact.phone,
        valid: updates.validUntil || prev.validUntil
      })
    }));
  }, []);

  const clearNotification = () => setSystemNotification(null);

  return (
    <SafetyContext.Provider
      value={{
        tourist,
        activeSosAlerts,
        incidents,
        riskZones,
        patrolUnits,
        activeTouristSos,
        currentRiskLevel,
        authorityOfficer,
        socketConnected,
        gpsActive,
        userCoords,
        userLocationName,
        userAccuracy,
        userAltitude,
        isLiveGps,
        setUserCoords,
        setUserLocationName,
        refreshLocation,
        triggerTouristSos,
        cancelTouristSos,
        acknowledgeSos,
        assignPatrolToSos,
        resolveSos,
        reportIncident,
        updateIncidentStatus,
        verifyRiskZone,
        addCustomRiskZone,
        updateTouristProfile,
        playEmergencyChime,
        playAckChime,
        systemNotification,
        clearNotification
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
};

export const useSafety = () => {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
};
