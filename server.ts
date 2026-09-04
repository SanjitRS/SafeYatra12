import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';

const JWT_SECRET = process.env.JWT_SECRET || 'tourist-safety-ops-console-secret-key-2026';
const PORT = 3000;

const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(express.json());

// In-Memory Database Store Initialized with Mission-Critical Data
const users = [
  {
    id: 'usr-1',
    badgeNumber: '#4092',
    name: 'Officer M. Vance',
    role: 'dispatcher',
    rank: 'Dispatch Lead',
    email: 'm.vance@police.gov',
    zone: 'Zone 4: Historic Downtown & Waterfront',
    shiftStatus: 'active',
  },
  {
    id: 'usr-2',
    badgeNumber: '#1104',
    name: 'Officer K. Chen',
    role: 'officer',
    rank: 'Field Officer',
    email: 'k.chen@police.gov',
    zone: 'Zone 2: Waterfront',
    shiftStatus: 'active',
  },
  {
    id: 'usr-3',
    badgeNumber: '#9001',
    name: 'Commander S. Thorne',
    role: 'admin',
    rank: 'Operations Director',
    email: 's.thorne@police.gov',
    zone: 'All Sectors (HQ)',
    shiftStatus: 'active',
  },
];

let sosAlerts = [
  {
    id: 'SOS-99421',
    severity: 'critical',
    status: 'active_queue',
    tourist: {
      id: 'TR-99421',
      name: 'Elena Rostova',
      nationality: 'RUS',
      passportNumber: 'RU-5528190',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      emergencyContact: '+7 (916) 420-8812',
      tripValidity: 'OCT 10 - NOV 02, 2026',
      medicalAlert: 'Asthma inhaler required. High tachycardia registered.',
      hotelLocation: 'Marina Bay Grand Resort, Room 1402',
      verifiedBiometric: true,
    },
    triggerTime: '14:22:01 UTC',
    createdAt: Date.now() - 3.7 * 60 * 1000, // 3m 42s ago
    batteryPercent: 14,
    heartRateBpm: 142,
    signalStrength: 'Cellular + Satellite (Strong)',
    locationName: 'Pier 39 Boardwalk, Zone 4',
    zone: 'Zone 4: Historic Downtown & Waterfront',
    gps: { lat: 37.7749, lng: -122.4194 },
    timeline: [
      {
        id: 'tl-1',
        timestamp: '14:22:01 UTC',
        label: 'TRIGGERED',
        description: 'Panic button pressed via Tourist Safety Mobile App.',
        type: 'triggered',
      },
      {
        id: 'tl-2',
        timestamp: '14:23:15 UTC',
        label: 'BEACON LOCK',
        description: 'Cell tower & GPS lock confirmed by automated gateway.',
        type: 'acknowledged',
      },
    ],
    notes: 'Tourist sounded panicked on automated audio ping. Background noise indicates crowded commercial area near waterfront. Unit requested.',
  },
  {
    id: 'SOS-88210',
    severity: 'high',
    status: 'acknowledged',
    tourist: {
      id: 'TR-88210',
      name: 'Marcus Chen',
      nationality: 'CAN',
      passportNumber: 'CA-8891043',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      emergencyContact: '+1 (416) 555-0199',
      tripValidity: 'OCT 15 - NOV 12, 2026',
      hotelLocation: 'Fairmont Waterfront Hotel',
      verifiedBiometric: true,
    },
    triggerTime: '14:15:30 UTC',
    createdAt: Date.now() - 10.2 * 60 * 1000,
    batteryPercent: 82,
    heartRateBpm: 104,
    signalStrength: 'Cellular LTE (Stable)',
    locationName: 'Temple Street Alley, Sector 2',
    zone: 'Zone 4: Historic Downtown & Waterfront',
    gps: { lat: 37.7833, lng: -122.4167 },
    timeline: [
      {
        id: 'tl-10',
        timestamp: '14:15:30 UTC',
        label: 'TRIGGERED',
        description: 'Silent panic alert received via app shortcut.',
        type: 'triggered',
      },
      {
        id: 'tl-11',
        timestamp: '14:16:45 UTC',
        label: 'ACKNOWLEDGED',
        description: 'Dispatcher M. Vance locked telemetry and established monitoring.',
        officerBadge: '#4092',
        type: 'acknowledged',
      },
    ],
    notes: 'Tourist reported disorientation and harassment by unlicensed taxi touts.',
  },
  {
    id: 'SOS-72109',
    severity: 'moderate',
    status: 'dispatched',
    tourist: {
      id: 'TR-72109',
      name: 'Sarah Jenkins',
      nationality: 'GBR',
      passportNumber: 'UK-7201994',
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      emergencyContact: '+44 20 7946 0912',
      tripValidity: 'OCT 01 - OCT 30, 2026',
      medicalAlert: 'Diabetic - Carry glucose gel pack',
      hotelLocation: 'Heritage Boutique Inn',
      verifiedBiometric: true,
    },
    triggerTime: '14:02:11 UTC',
    createdAt: Date.now() - 23.5 * 60 * 1000,
    batteryPercent: 64,
    heartRateBpm: 88,
    signalStrength: 'Cellular 5G (Excellent)',
    locationName: 'Coastal Highway km 14 Overlook',
    zone: 'Zone 2: Waterfront',
    gps: { lat: 37.7692, lng: -122.4461 },
    assignedUnitId: 'UNT-9021',
    assignedUnitCallsign: 'Alpha-01 (Patrol Car)',
    eta: '3 minutes',
    timeline: [
      {
        id: 'tl-20',
        timestamp: '14:02:11 UTC',
        label: 'TRIGGERED',
        description: 'SOS transmitted from Coastal viewpoint.',
        type: 'triggered',
      },
      {
        id: 'tl-21',
        timestamp: '14:03:00 UTC',
        label: 'ACKNOWLEDGED',
        description: 'Acknowledged by Central Dispatch.',
        officerBadge: '#4092',
        type: 'acknowledged',
      },
      {
        id: 'tl-22',
        timestamp: '14:06:20 UTC',
        label: 'DISPATCHED',
        description: 'Unit Alpha-01 dispatched with sirens en route. ETA 3m.',
        officerBadge: '#4092',
        type: 'dispatched',
      },
    ],
    notes: 'Tourist vehicle broke down on unlit coastal shoulder during dusk.',
  },
];

let incidents = [
  {
    id: 'INC-8892',
    type: 'Theft',
    location: 'Historic Downtown (Block 4)',
    zone: 'Zone 4: Historic Downtown & Waterfront',
    severity: 'critical',
    reportedTime: '14:42 SGT (12 mins ago)',
    status: 'under_review',
    assignedOfficer: 'Officer M. Vance #4092',
    touristId: 'PASSPORT-US-99821',
    touristName: 'Evelyn Grace Sinclair',
    gps: { lat: 1.2897, lng: 103.8501 },
    statement: 'Two individuals on electric scooters approached me near the temple entrance, snatched my sling bag containing my passport, wallet, and camera equipment, and fled down the alley towards the waterfront.',
    photoEvidence: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=600&q=80',
    notesLog: [
      {
        id: 'nl-1',
        author: 'Officer Vance #4092',
        timestamp: '14:45 SGT',
        text: 'Dispatched unit 409 to scene. Contacted tourist via phone.',
      },
      {
        id: 'nl-2',
        author: 'System Auto',
        timestamp: '14:42 SGT',
        text: 'Incident created via SOS Mobile App override button.',
      },
    ],
  },
  {
    id: 'INC-8891',
    type: 'Medical',
    location: 'Orchard Central Mall, Level 2',
    zone: 'Zone 2: Orchard Road',
    severity: 'high',
    reportedTime: '34 mins ago',
    status: 'action_taken',
    assignedOfficer: 'Officer K. Chen #1104',
    touristId: 'PASSPORT-AU-33019',
    touristName: 'Liam Hemsworth',
    gps: { lat: 1.3005, lng: 103.8398 },
    statement: 'Severe heat exhaustion and dehydration following outdoor heritage walking tour.',
    photoEvidence: '',
    notesLog: [
      {
        id: 'nl-3',
        author: 'Officer K. Chen #1104',
        timestamp: '14:20 SGT',
        text: 'Paramedics on scene providing saline IV.',
      },
    ],
  },
  {
    id: 'INC-8890',
    type: 'Harassment',
    location: 'Marina Bay Sands Promenade',
    zone: 'Zone 1: Marina Bay',
    severity: 'medium',
    reportedTime: '1 hour ago',
    status: 'closed',
    assignedOfficer: 'Officer R. Davis #2209',
    touristId: 'PASSPORT-FR-88192',
    touristName: 'Chloe Dubois',
    gps: { lat: 1.2838, lng: 103.8591 },
    statement: 'Aggressive street vendor demanding cash for photos taken near waterfront statue.',
    photoEvidence: '',
    notesLog: [
      {
        id: 'nl-4',
        author: 'Officer R. Davis #2209',
        timestamp: '13:45 SGT',
        text: 'Vendor instructed to leave sector; tourist escorted to ferry terminal safely.',
      },
    ],
  },
  {
    id: 'INC-8889',
    type: 'Lost Property',
    location: 'Siloso Beach Walk',
    zone: 'Zone 3: Sentosa Resort',
    severity: 'low',
    reportedTime: '2 hours ago',
    status: 'under_review',
    assignedOfficer: 'Unassigned',
    touristId: 'PASSPORT-DE-55410',
    touristName: 'Hans Becker',
    gps: { lat: 1.2541, lng: 103.8115 },
    statement: 'Lost backpack containing camera lenses and hotel key card on bench near beach pavilion.',
    photoEvidence: '',
    notesLog: [],
  },
  {
    id: 'INC-8888',
    type: 'Scam',
    location: 'Chinatown Market St',
    zone: 'Zone 4: Historic Downtown & Waterfront',
    severity: 'medium',
    reportedTime: '3 hours ago',
    status: 'action_taken',
    assignedOfficer: 'Officer J. Smith #3312',
    touristId: 'PASSPORT-JP-11928',
    touristName: 'Kenji Sato',
    gps: { lat: 1.2830, lng: 103.8440 },
    statement: 'Counterfeit jade jewelry sold under false certificate of authenticity.',
    photoEvidence: '',
    notesLog: [
      {
        id: 'nl-5',
        author: 'Officer J. Smith #3312',
        timestamp: '11:40 SGT',
        text: 'Vendor stall flagged for trade inspection audit.',
      },
    ],
  },
];

let units = [
  {
    id: 'UNT-9021',
    callsign: 'Alpha-01',
    type: 'Police Squad',
    vehicle: 'Ford Interceptor SUV',
    assignedZone: 'Zone 4: Historic Downtown & Waterfront',
    status: 'Dispatched',
    gps: { lat: 37.7767, lng: -122.4170, landmark: 'Main St & 4th Ave' },
    crewLead: 'Capt. R. Briggs',
    crewCount: 4,
    commsFreq: '154.25 MHz (Ch. 1)',
  },
  {
    id: 'UNT-8832',
    callsign: 'Tourist-Patrol 04',
    type: 'Tourist Police',
    vehicle: 'Electric Cart / Segway',
    assignedZone: 'Zone 2: Waterfront',
    status: 'Available',
    gps: { lat: 37.7801, lng: -122.4112, landmark: 'Pier 7 Boardwalk' },
    crewLead: 'Officer S. Lin',
    crewCount: 2,
    commsFreq: '155.12 MHz (Ch. 3)',
  },
  {
    id: 'UNT-7714',
    callsign: 'Med-Unit 02',
    type: 'Medical Unit',
    vehicle: 'Advanced Life Support Van',
    assignedZone: 'Zone 4: Historic Downtown & Waterfront',
    status: 'On Scene',
    gps: { lat: 37.7750, lng: -122.4112, landmark: 'Grand Hotel Plaza' },
    crewLead: 'Dr. K. Aris',
    crewCount: 3,
    commsFreq: '160.45 MHz (Med-1)',
  },
  {
    id: 'UNT-6650',
    callsign: 'Harbor-Guard Alpha',
    type: 'Harbor Patrol',
    vehicle: 'Interceptors 32ft RIB',
    assignedZone: 'Zone 2: Waterfront',
    status: 'En Route',
    gps: { lat: 37.7845, lng: -122.4120, landmark: 'Marina Slip 12' },
    crewLead: 'Lt. J. Holloway',
    crewCount: 3,
    commsFreq: '156.80 MHz (Marine 16)',
  },
  {
    id: 'UNT-9045',
    callsign: 'Beta-03',
    type: 'Police Squad',
    vehicle: 'Armored Patrol Cruiser',
    assignedZone: 'Zone 1: Airport Hub',
    status: 'Offline',
    gps: { lat: 37.7898, lng: -122.4203, landmark: 'Terminal B Depot' },
    crewLead: 'Sgt. M. Chen',
    crewCount: 2,
    commsFreq: 'STANDBY 0.0',
  },
  {
    id: 'UNT-9099',
    callsign: 'Delta-05',
    type: 'Police Squad',
    vehicle: 'Rapid Response Cruiser',
    assignedZone: 'Zone 4: Historic Downtown & Waterfront',
    status: 'Available',
    gps: { lat: 37.7730, lng: -122.4220, landmark: 'City Hall Sector' },
    crewLead: 'Officer D. Miller',
    crewCount: 2,
    commsFreq: '154.50 MHz (Ch. 5)',
  },
  {
    id: 'UNT-5521',
    callsign: 'Bike-Squad 02',
    type: 'Tourist Police',
    vehicle: 'Tactical e-Bikes',
    assignedZone: 'Zone 4: Historic Downtown & Waterfront',
    status: 'Available',
    gps: { lat: 37.7790, lng: -122.4180, landmark: 'Historic Market Promenade' },
    crewLead: 'Officer L. Adams',
    crewCount: 2,
    commsFreq: '155.40 MHz (Ch. 4)',
  },
];

let touristDatabase = [
  {
    id: 'US-PASS-8941',
    passportNumber: 'US-***-8941',
    name: 'EVELYN GRACE SINCLAIR',
    nationality: 'UNITED STATES (USA)',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    emergencyContact: '+1 (555) 382-9012',
    tripValidity: 'OCT 12 - NOV 04, 2026',
    medicalAlert: 'Penicillin allergy. Mild asthma reported. Requires inhaler access in high-altitude zones.',
    biometricMatch: 99.4,
    status: 'VALID',
    verifiedBiometric: true,
  },
  {
    id: 'UK-PASS-3321',
    passportNumber: 'UK-***-3321',
    name: 'DANIEL ARTHUR BROOKS',
    nationality: 'UNITED KINGDOM (GBR)',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    emergencyContact: '+44 7700 900421',
    tripValidity: 'SEP 01 - OCT 01, 2026',
    medicalAlert: 'None declared.',
    biometricMatch: 81.2,
    status: 'FLAGGED',
    flagReason: 'Suspicious Hologram / Tampered Document',
    flagNotes: 'Flagged by Sector 4 watchlist. Discrepancy in laminate security watermark.',
    verifiedBiometric: false,
  },
  {
    id: 'JP-PASS-9012',
    passportNumber: 'JP-***-9012',
    name: 'YUKI TAKAHASHI',
    nationality: 'JAPAN (JPN)',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    emergencyContact: '+81 90-1234-5678',
    tripValidity: 'AUG 10 - SEP 01, 2026',
    medicalAlert: 'None declared.',
    biometricMatch: 98.7,
    status: 'EXPIRED',
    verifiedBiometric: true,
  },
  {
    id: 'CA-PASS-5548',
    passportNumber: 'CA-***-5548',
    name: 'MARCUS A. ROY',
    nationality: 'CANADA (CAN)',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    emergencyContact: '+1 514 555-8910',
    tripValidity: 'OCT 20 - NOV 28, 2026',
    medicalAlert: 'Severe peanut allergy. Carries EpiPen.',
    biometricMatch: 99.1,
    status: 'VALID',
    verifiedBiometric: true,
  },
];

let verificationLogs = [
  {
    id: 'vl-1',
    timestamp: '2026-10-24 14:32:10',
    officerBadge: 'OFFICER #4092',
    scannedId: 'US-***-8941',
    touristName: 'Evelyn Grace Sinclair',
    method: 'QR Camera',
    result: 'VALID',
  },
  {
    id: 'vl-2',
    timestamp: '2026-10-24 14:18:45',
    officerBadge: 'OFFICER #4092',
    scannedId: 'UK-***-3321',
    touristName: 'Daniel Arthur Brooks',
    method: 'Manual Input',
    result: 'FLAGGED',
  },
  {
    id: 'vl-3',
    timestamp: '2026-10-24 13:55:02',
    officerBadge: 'OFFICER #1104',
    scannedId: 'JP-***-9012',
    touristName: 'Yuki Takahashi',
    method: 'QR Camera',
    result: 'EXPIRED',
  },
  {
    id: 'vl-4',
    timestamp: '2026-10-24 13:12:40',
    officerBadge: 'OFFICER #4092',
    scannedId: 'CA-***-5548',
    touristName: 'Marcus A. Roy',
    method: 'QR Camera',
    result: 'VALID',
  },
];

let riskZones = [
  {
    id: 'RZ-01',
    name: 'RZ-01 • Old Port Waterfront',
    description: 'High Crime / Rough Sea',
    riskLevel: 'RED ZONE',
    geometryType: 'polygon',
    coordinatesSummary: 'Polygon [37.784, -122.418 × 6pts]',
    polygonPoints: [
      [37.788, -122.420],
      [37.789, -122.412],
      [37.784, -122.410],
      [37.781, -122.415],
      [37.783, -122.421],
    ],
    touristDensity: 1840,
    densityTrend: '+12% in last hr',
    pushNotificationStatus: 'Active (Every 30m)',
    customWarning: 'WARNING: Hazardous wave surge and high petty theft activity reported at pier docks. Do not leave valuables unattended.',
    triggers: {
      pushOnEntry: true,
      sendSms: true,
      autoDispatchLoitering: true,
    },
  },
  {
    id: 'AZ-04',
    name: 'AZ-04 • Grand Bazaar Market',
    description: 'Caution / Crowded Bazaar',
    riskLevel: 'AMBER ZONE',
    geometryType: 'radius',
    coordinatesSummary: 'Radius 1.2km [37.778, -122.415]',
    center: [37.778, -122.415],
    radiusKm: 1.2,
    touristDensity: 6100,
    densityTrend: 'Peak Capacity',
    pushNotificationStatus: 'Active (Threshold breach)',
    customWarning: 'CAUTION: Heavy pedestrian congestion. Watch for pickpockets and keep backpacks in front.',
    triggers: {
      pushOnEntry: true,
      sendSms: false,
      autoDispatchLoitering: false,
    },
  },
  {
    id: 'GZ-09',
    name: 'GZ-09 • Museum Quarter',
    description: 'Secure Tourist District',
    riskLevel: 'GREEN ZONE',
    geometryType: 'polygon',
    coordinatesSummary: 'Polygon [37.772, -122.423 × 4pts]',
    polygonPoints: [
      [37.775, -122.425],
      [37.776, -122.420],
      [37.771, -122.419],
      [37.770, -122.424],
    ],
    touristDensity: 3200,
    densityTrend: 'Stable flow',
    pushNotificationStatus: 'Standby / Off',
    customWarning: 'Welcome to the Museum Quarter. Police assistance booth located at central plaza.',
    triggers: {
      pushOnEntry: false,
      sendSms: false,
      autoDispatchLoitering: false,
    },
  },
  {
    id: 'RZ-02',
    name: 'RZ-02 • East Industrial Periphery',
    description: 'High Crime / Abandoned Structures',
    riskLevel: 'RED ZONE',
    geometryType: 'polygon',
    coordinatesSummary: 'Polygon [37.765, -122.435 × 8pts]',
    polygonPoints: [
      [37.768, -122.438],
      [37.769, -122.431],
      [37.763, -122.430],
      [37.761, -122.436],
    ],
    touristDensity: 140,
    densityTrend: 'Intrusion Alert (2)',
    pushNotificationStatus: 'Active (Immediate Alert)',
    customWarning: 'RESTRICTED SECTOR: Unauthorized tourist entry detected. Area unlit and unstable.',
    triggers: {
      pushOnEntry: true,
      sendSms: true,
      autoDispatchLoitering: true,
    },
  },
];

let activityFeed = [
  {
    id: 'act-1',
    type: 'sos',
    title: 'SOS ALERT',
    description: 'SOS received from Tourist #8921 (Elena Rostova) at Marina Bay waterfront sector.',
    timestamp: '10:42:15 AM',
    severity: 'critical',
    gps: 'GPS: 37.7749° N, 122.4194° W',
    actionText: 'Dispatch',
  },
  {
    id: 'act-2',
    type: 'dispatch',
    title: 'UNIT DISPATCH',
    description: 'Unit #4 (Alpha-01) dispatched to Temple Street by Officer Vance.',
    timestamp: '10:40:02 AM',
    severity: 'info',
    actionText: 'ETA: 3m 40s',
  },
  {
    id: 'act-3',
    type: 'verification',
    title: 'ID VERIFIED',
    description: 'Tourist ID #US-8941 verified successfully at Checkpoint B (Downtown).',
    timestamp: '10:38:19 AM',
    severity: 'success',
    actionText: 'PASSPORT SECURE',
  },
  {
    id: 'act-4',
    type: 'incident',
    title: 'INCIDENT UPDATE',
    description: 'Incident #INC-8890 updated status to Closed (Resolved by Unit #11).',
    timestamp: '10:35:00 AM',
    severity: 'warning',
    actionText: 'Resolved',
  },
];

// ----------------- Auth Middleware -----------------
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// ----------------- API Endpoints -----------------

// Auth Login
app.post('/api/auth/login', (req, res) => {
  const { role, badgeNumber } = req.body;
  const user = users.find((u) => u.role === role || u.badgeNumber === badgeNumber) || users[0];

  const token = jwt.sign(
    {
      id: user.id,
      badgeNumber: user.badgeNumber,
      name: user.name,
      role: user.role,
      rank: user.rank,
      zone: user.zone,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, user });
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const user = users.find((u) => u.id === req.user.id) || req.user;
  res.json({ user });
});

// SOS Alerts
app.get('/api/sos', (req, res) => {
  res.json({ alerts: sosAlerts });
});

app.post('/api/sos', (req, res) => {
  const newAlert = {
    id: `SOS-${Math.floor(10000 + Math.random() * 90000)}`,
    severity: req.body.severity || 'critical',
    status: 'active_queue',
    tourist: req.body.tourist || {
      id: `TR-${Math.floor(10000 + Math.random() * 90000)}`,
      name: 'Simulated Tourist',
      nationality: 'USA',
      passportNumber: 'US-9901234',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      emergencyContact: '+1 (555) 012-3456',
      tripValidity: 'OCT 20 - NOV 15, 2026',
      hotelLocation: 'Downtown Grand',
      verifiedBiometric: true,
    },
    triggerTime: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' UTC',
    createdAt: Date.now(),
    batteryPercent: req.body.batteryPercent || Math.floor(15 + Math.random() * 70),
    heartRateBpm: req.body.heartRateBpm || Math.floor(110 + Math.random() * 40),
    signalStrength: 'Cellular 5G (Direct SOS Link)',
    locationName: req.body.locationName || 'Waterfront Promenade Pier 4',
    zone: req.body.zone || 'Zone 4: Historic Downtown & Waterfront',
    gps: req.body.gps || { lat: 37.7749 + (Math.random() - 0.5) * 0.02, lng: -122.4194 + (Math.random() - 0.5) * 0.02 },
    timeline: [
      {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' UTC',
        label: 'TRIGGERED',
        description: 'Distress Beacon emitted from mobile client application.',
        type: 'triggered',
      },
    ],
    notes: req.body.notes || 'Automated SOS alert push trigger.',
  };

  sosAlerts.unshift(newAlert as any);

  const activityItem = {
    id: `act-${Date.now()}`,
    type: 'sos',
    title: 'NEW SOS SIGNAL DETECTED',
    description: `Distress beacon from ${newAlert.tourist.name} (${newAlert.tourist.nationality}) at ${newAlert.locationName}.`,
    timestamp: new Date().toLocaleTimeString(),
    severity: 'critical',
    gps: `GPS: ${newAlert.gps.lat.toFixed(4)}° N, ${Math.abs(newAlert.gps.lng).toFixed(4)}° W`,
    actionText: 'Intervene',
  };
  activityFeed.unshift(activityItem as any);

  io.emit('sos:new', newAlert);
  io.emit('activity:new', activityItem);

  res.status(201).json({ alert: newAlert });
});

// Acknowledge, Dispatch, or Resolve SOS
app.put('/api/sos/:id', (req, res) => {
  const { id } = req.params;
  const { action, assignedUnitId, assignedUnitCallsign, eta, notes } = req.body;

  const alertIndex = sosAlerts.findIndex((a) => a.id === id);
  if (alertIndex === -1) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  const alert = sosAlerts[alertIndex];
  const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false }) + ' UTC';

  if (action === 'acknowledge') {
    alert.status = 'acknowledged';
    alert.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: nowTime,
      label: 'ACKNOWLEDGED',
      description: `Alert acknowledged by operator. Telemetry and voice link locked.`,
      officerBadge: '#4092',
      type: 'acknowledged',
    });
  } else if (action === 'dispatch') {
    alert.status = 'dispatched';
    alert.assignedUnitId = assignedUnitId;
    alert.assignedUnitCallsign = assignedUnitCallsign;
    alert.eta = eta || '3 minutes';
    alert.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: nowTime,
      label: 'DISPATCHED',
      description: `Response Unit [${assignedUnitCallsign || assignedUnitId}] dispatched with ETA ${alert.eta}.`,
      officerBadge: '#4092',
      type: 'dispatched',
    });

    // Update the unit's status in the unit roster
    if (assignedUnitId) {
      const u = units.find((u) => u.id === assignedUnitId);
      if (u) {
        u.status = 'Dispatched';
        io.emit('unit:update', u);
      }
    }
  } else if (action === 'resolve') {
    alert.status = 'resolved';
    alert.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: nowTime,
      label: 'RESOLVED',
      description: 'Incident resolved and secure debrief completed. Case logged.',
      officerBadge: '#4092',
      type: 'resolved',
    });
  }

  if (notes !== undefined) {
    alert.notes = notes;
  }

  const activityItem = {
    id: `act-${Date.now()}`,
    type: action === 'dispatch' ? 'dispatch' : 'system',
    title: `ALERT ${action.toUpperCase()}`,
    description: `Incident ${alert.id} (${alert.tourist.name}): Status updated to ${alert.status.replace('_', ' ').toUpperCase()}.`,
    timestamp: new Date().toLocaleTimeString(),
    severity: action === 'resolve' ? 'success' : 'warning',
  };
  activityFeed.unshift(activityItem as any);

  io.emit('sos:update', alert);
  io.emit('activity:new', activityItem);

  res.json({ alert });
});

// Demo Simulator for reviewer: Instant live SOS injection
app.post('/api/simulate-sos', (req, res) => {
  const names = [
    { name: 'Elena Rostova', nat: 'RUS', passport: 'RU-5528190', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' },
    { name: 'Lucas Martin', nat: 'FRA', passport: 'FR-9941029', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80' },
    { name: 'Sofia Rodriguez', nat: 'ESP', passport: 'ES-7739102', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80' },
  ];
  const choice = names[Math.floor(Math.random() * names.length)];

  const simAlert = {
    id: `SOS-${Math.floor(10000 + Math.random() * 90000)}`,
    severity: 'critical',
    status: 'active_queue',
    tourist: {
      id: `TR-${Math.floor(10000 + Math.random() * 90000)}`,
      name: choice.name,
      nationality: choice.nat,
      passportNumber: choice.passport,
      photoUrl: choice.img,
      emergencyContact: '+1 (555) 839-2041',
      tripValidity: 'OCT 12 - NOV 18, 2026',
      medicalAlert: 'Asthma inhaler required. High stress tachycardia reported.',
      hotelLocation: 'Waterfront Continental Hotel, Suite 904',
      verifiedBiometric: true,
    },
    triggerTime: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' UTC',
    createdAt: Date.now(),
    batteryPercent: Math.floor(12 + Math.random() * 15),
    heartRateBpm: Math.floor(135 + Math.random() * 25),
    signalStrength: 'Satellite + 5G Mesh Link',
    locationName: 'Marina Promenade Boardwalk, Zone 4',
    zone: 'Zone 4: Historic Downtown & Waterfront',
    gps: { lat: 37.7749 + (Math.random() - 0.5) * 0.015, lng: -122.4194 + (Math.random() - 0.5) * 0.015 },
    timeline: [
      {
        id: `tl-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' UTC',
        label: 'PANIC TRIGGER',
        description: 'Physical panic button double-press on smart safety wristband.',
        type: 'triggered',
      },
    ],
    notes: 'Real-time simulated high-priority distress trigger for dispatch test.',
  };

  sosAlerts.unshift(simAlert as any);

  const act = {
    id: `act-${Date.now()}`,
    type: 'sos',
    title: '🚨 INCOMING LIVE SOS DISTRESS',
    description: `Beacon received from ${simAlert.tourist.name} (${simAlert.tourist.nationality}) at ${simAlert.locationName}. Battery: ${simAlert.batteryPercent}%.`,
    timestamp: new Date().toLocaleTimeString(),
    severity: 'critical',
    gps: `GPS: ${simAlert.gps.lat.toFixed(4)}° N, ${Math.abs(simAlert.gps.lng).toFixed(4)}° W`,
    actionText: 'Dispatch Unit',
  };
  activityFeed.unshift(act as any);

  io.emit('sos:new', simAlert);
  io.emit('activity:new', act);

  res.json({ success: true, alert: simAlert });
});

// Incidents
app.get('/api/incidents', (req, res) => {
  res.json({ incidents });
});

app.post('/api/incidents', (req, res) => {
  const newInc = {
    id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
    type: req.body.type || 'Theft',
    location: req.body.location || 'Historic District',
    zone: req.body.zone || 'Zone 4: Historic Downtown & Waterfront',
    severity: req.body.severity || 'high',
    reportedTime: 'Just now',
    status: 'under_review',
    assignedOfficer: req.body.assignedOfficer || 'Officer M. Vance #4092',
    touristId: req.body.touristId || 'PASSPORT-US-99821',
    touristName: req.body.touristName || 'Tourist Visitor',
    gps: req.body.gps || { lat: 1.2897, lng: 103.8501 },
    statement: req.body.statement || 'Incident recorded through dispatcher console.',
    photoEvidence: req.body.photoEvidence || '',
    notesLog: [
      {
        id: `nl-${Date.now()}`,
        author: 'System Auto',
        timestamp: new Date().toLocaleTimeString(),
        text: 'Manual report logged into stream.',
      },
    ],
  };

  incidents.unshift(newInc as any);
  io.emit('incident:new', newInc);

  res.status(201).json({ incident: newInc });
});

app.put('/api/incidents/:id', (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  const inc = incidents.find((i) => i.id === id);
  if (!inc) return res.status(404).json({ error: 'Incident not found' });

  if (status) inc.status = status;
  if (note) {
    inc.notesLog.unshift({
      id: `nl-${Date.now()}`,
      author: req.body.author || 'Officer Vance #4092',
      timestamp: new Date().toLocaleTimeString(),
      text: note,
    });
  }

  io.emit('incident:update', inc);
  res.json({ incident: inc });
});

// Response Units
app.get('/api/units', (req, res) => {
  res.json({ units });
});

app.post('/api/units', (req, res) => {
  const newUnit = {
    id: req.body.id || `UNT-${Math.floor(1000 + Math.random() * 9000)}`,
    callsign: req.body.callsign || 'Bravo-09',
    type: req.body.type || 'Police Squad',
    vehicle: req.body.vehicle || 'Patrol Vehicle',
    assignedZone: req.body.assignedZone || 'Zone 4: Historic Downtown & Waterfront',
    status: req.body.status || 'Available',
    gps: req.body.gps || { lat: 37.7767, lng: -122.4170, landmark: 'Command HQ' },
    crewLead: req.body.crewLead || 'Officer Field Lead',
    crewCount: req.body.crewCount || 2,
    commsFreq: req.body.commsFreq || '154.50 MHz (Ch. 5)',
  };

  units.push(newUnit as any);
  io.emit('unit:new', newUnit);
  res.status(201).json({ unit: newUnit });
});

app.put('/api/units/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const u = units.find((item) => item.id === id || item.callsign === id);
  if (!u) return res.status(404).json({ error: 'Unit not found' });

  u.status = status;
  io.emit('unit:update', u);
  res.json({ unit: u });
});

// ID Verification
app.get('/api/verification/lookup', (req, res) => {
  const query = (req.query.q as string || '').trim().toUpperCase();
  const tourist = touristDatabase.find(
    (t) => t.id.includes(query) || t.passportNumber.includes(query) || t.name.toUpperCase().includes(query)
  ) || touristDatabase[0]; // fallback to default sample if query not exact for demo ease

  res.json({ tourist });
});

app.post('/api/verification/log', (req, res) => {
  const { touristId, officerBadge, method, result, notes } = req.body;
  const tourist = touristDatabase.find((t) => t.id === touristId || t.passportNumber === touristId);

  const logEntry = {
    id: `vl-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    officerBadge: officerBadge || 'OFFICER #4092',
    scannedId: tourist ? tourist.passportNumber : touristId,
    touristName: tourist ? tourist.name : 'Scanned Subject',
    method: method || 'QR Camera',
    result: result || 'VALID',
    notes: notes || '',
  };

  verificationLogs.unshift(logEntry as any);

  const activityItem = {
    id: `act-${Date.now()}`,
    type: 'verification',
    title: 'ID SCAN AUDITED',
    description: `Scanned ID ${logEntry.scannedId} (${logEntry.touristName}): Result ${logEntry.result}.`,
    timestamp: new Date().toLocaleTimeString(),
    severity: logEntry.result === 'VALID' ? 'success' : 'warning',
    actionText: logEntry.result,
  };
  activityFeed.unshift(activityItem as any);

  io.emit('verification:new', logEntry);
  io.emit('activity:new', activityItem);

  res.status(201).json({ log: logEntry });
});

app.post('/api/verification/flag', (req, res) => {
  const { touristId, reason, notes } = req.body;
  const tourist = touristDatabase.find((t) => t.id === touristId || t.passportNumber === touristId);
  if (tourist) {
    tourist.status = 'FLAGGED';
    (tourist as any).flagReason = reason;
    (tourist as any).flagNotes = notes;
  }

  const logEntry = {
    id: `vl-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    officerBadge: 'OFFICER #4092',
    scannedId: tourist ? tourist.passportNumber : touristId,
    touristName: tourist ? tourist.name : 'Flagged Subject',
    method: 'Manual Flag',
    result: 'FLAGGED',
    notes: `${reason} - ${notes}`,
  };
  verificationLogs.unshift(logEntry as any);

  const activityItem = {
    id: `act-${Date.now()}`,
    type: 'verification',
    title: '⚠️ PASSPORT/ID FLAGGED ON WATCHLIST',
    description: `Subject ${tourist ? tourist.name : touristId} flagged for ${reason}. Broadcasted to Sector Units.`,
    timestamp: new Date().toLocaleTimeString(),
    severity: 'critical',
  };
  activityFeed.unshift(activityItem as any);

  io.emit('verification:new', logEntry);
  io.emit('activity:new', activityItem);

  res.json({ success: true, log: logEntry });
});

app.get('/api/verification/logs', (req, res) => {
  res.json({ logs: verificationLogs });
});

// Risk Zones
app.get('/api/risk-zones', (req, res) => {
  res.json({ zones: riskZones });
});

app.post('/api/risk-zones', (req, res) => {
  const newZone = {
    id: req.body.id || `RZ-${Math.floor(10 + Math.random() * 90)}`,
    name: req.body.name || 'New Geofence Zone',
    description: req.body.description || 'Monitored tourist zone',
    riskLevel: req.body.riskLevel || 'AMBER ZONE',
    geometryType: req.body.geometryType || 'polygon',
    coordinatesSummary: req.body.coordinatesSummary || 'Polygon [Custom Coordinates]',
    polygonPoints: req.body.polygonPoints,
    touristDensity: req.body.touristDensity || Math.floor(500 + Math.random() * 2000),
    densityTrend: '+5% in last hr',
    pushNotificationStatus: 'Active (Instant Alert)',
    customWarning: req.body.customWarning || 'Safety notice active for this zone.',
    triggers: req.body.triggers || {
      pushOnEntry: true,
      sendSms: true,
      autoDispatchLoitering: false,
    },
  };

  riskZones.push(newZone as any);
  io.emit('zone:new', newZone);

  res.status(201).json({ zone: newZone });
});

app.post('/api/risk-zones/broadcast', (req, res) => {
  const { zoneId, message } = req.body;
  const act = {
    id: `act-${Date.now()}`,
    type: 'system',
    title: '📢 EMERGENCY GEOFENCE BROADCAST DISPATCHED',
    description: message || 'Urgent safety broadcast sent to all mobile devices within selected risk zones.',
    timestamp: new Date().toLocaleTimeString(),
    severity: 'warning',
  };
  activityFeed.unshift(act as any);
  io.emit('activity:new', act);
  res.json({ success: true });
});

// Live Activity Stream
app.get('/api/activity', (req, res) => {
  res.json({ activities: activityFeed });
});

// Dashboard Overview Metrics
app.get('/api/dashboard/stats', (req, res) => {
  const activeSos = sosAlerts.filter((a) => a.status === 'active_queue' || a.status === 'acknowledged').length;
  const unresolvedInc = incidents.filter((i) => i.status !== 'closed').length;
  const availUnits = units.filter((u) => u.status === 'Available').length;

  res.json({
    activeSosCount: activeSos,
    unresolvedIncidentsCount: unresolvedInc,
    availableUnitsCount: availUnits,
    totalUnitsCount: units.length,
    avgAckTimeSeconds: 102, // 1m 42s
    avgResolutionTimeMinutes: 24.5,
  });
});

// Hourly volume trend for Recharts
app.get('/api/stats/hourly-volume', (req, res) => {
  const hours = [
    { time: '00:00', sos: 2, incidents: 3 },
    { time: '02:00', sos: 1, incidents: 2 },
    { time: '04:00', sos: 1, incidents: 1 },
    { time: '06:00', sos: 3, incidents: 4 },
    { time: '08:00', sos: 5, incidents: 8 },
    { time: '10:00', sos: 9, incidents: 12 },
    { time: '12:00', sos: 14, incidents: 15 },
    { time: '14:00', sos: 18, incidents: 21 }, // peak
    { time: '16:00', sos: 11, incidents: 14 },
    { time: '18:00', sos: 8, incidents: 10 },
    { time: '20:00', sos: 6, incidents: 7 },
    { time: '22:00', sos: 4, incidents: 5 },
  ];
  res.json({ hours });
});

// Panic Override broadcast
app.post('/api/panic-override', (req, res) => {
  const act = {
    id: `act-${Date.now()}`,
    type: 'sos',
    title: '⚡ SYSTEM-WIDE PANIC OVERRIDE ENGAGED',
    description: 'All field channels mobilized to Priority 1. Audible sirens broadcasted.',
    timestamp: new Date().toLocaleTimeString(),
    severity: 'critical',
  };
  activityFeed.unshift(act as any);
  io.emit('panic:override', { triggeredAt: Date.now() });
  io.emit('activity:new', act);
  res.json({ success: true });
});

// ----------------- Socket.IO Connection -----------------
io.on('connection', (socket) => {
  socket.emit('connection:ack', {
    status: 'connected',
    serverTime: new Date().toISOString(),
    node: 'US-EAST-04',
  });

  socket.on('client:ping', () => {
    socket.emit('server:pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    // client disconnected
  });
});

// ----------------- Vite & Server Startup -----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Operations Console Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
