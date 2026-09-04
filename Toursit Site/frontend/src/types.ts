export type RiskLevel = 'low' | 'medium' | 'high';

export type AlertStatus = 'triggered' | 'sent' | 'acknowledged' | 'assigned' | 'resolved' | 'cancelled';

export interface LocationCoords {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  address?: string;
  sector?: string;
}

export interface TouristProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  nationality: string;
  age: number;
  bloodGroup: string;
  medicalConditions: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  stayLocation: string;
  validUntil: string;
  permitType: string;
  qrPayload: string;
}

export interface SosAlert {
  id: string;
  touristId: string;
  touristName: string;
  touristPhone: string;
  timestamp: string; // ISO string
  status: AlertStatus;
  severity: 'critical' | 'priority' | 'advisory';
  location: LocationCoords;
  batteryLevel: number;
  pulseBpm?: number;
  impactG?: number;
  altitudeM: number;
  notes?: string;
  assignedUnit?: {
    id: string;
    name: string;
    officer: string;
    etaMinutes: number;
    distanceMeters: number;
    phone?: string;
  };
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface Incident {
  id: string;
  title: string;
  type: 'rockslide' | 'washout' | 'wildlife' | 'medical' | 'theft' | 'lost_hiker' | 'weather';
  description: string;
  severity: RiskLevel;
  status: 'reported' | 'investigating' | 'dispatched' | 'resolved';
  location: LocationCoords;
  reportedBy: string;
  reportedAt: string;
  imageUrl?: string;
  assignedResponder?: string;
}

export interface RiskZone {
  id: string;
  name: string;
  category: 'ravine' | 'landslide' | 'flood' | 'safe_corridor' | 'dense_fog' | 'avalanche';
  riskLevel: RiskLevel;
  source: 'ai_suggested' | 'authority_confirmed';
  coordinates: [number, number][]; // Polygon vertices [lat, lng]
  center: [number, number];
  areaSqKm?: number;
  confidenceScore?: number;
  activeTouristsCount: number;
  advisoryText: string;
  lastUpdated: string;
}

export interface PatrolUnit {
  id: string;
  name: string;
  callsign: string;
  sector: string;
  status: 'idle' | 'dispatched' | 'patrolling' | 'standby';
  officers: string[];
  currentSpeedKmH: number;
  location: [number, number];
  batteryLevel: number;
  assignedIncidentId?: string;
}

export interface EmergencyHelpline {
  id: string;
  name: string;
  department: string;
  number: string;
  description: string;
  category: 'national' | 'mountain_rescue' | 'police' | 'medical' | 'women_safety' | 'forest';
  icon: string;
  availability: string;
}
