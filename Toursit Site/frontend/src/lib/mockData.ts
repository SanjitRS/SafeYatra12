import { TouristProfile, SosAlert, Incident, RiskZone, PatrolUnit, EmergencyHelpline } from '../types';

export const INITIAL_TOURIST: TouristProfile = {
  id: 'SY-99214-IN',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@safeyatra.in',
  phone: '+91 98765 43210',
  photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  nationality: 'Indian National',
  age: 29,
  bloodGroup: 'B+',
  medicalConditions: ['Mild Asthma (Inhaler User)', 'Penicillin Allergy'],
  emergencyContact: {
    name: 'Priya Sharma (Sister)',
    relationship: 'Sister',
    phone: '+91 98765 43211'
  },
  stayLocation: 'Snow Crest Inn, Old Manali',
  validUntil: '28 Oct 2025',
  permitType: 'Solo High-Altitude Trek Permit',
  qrPayload: JSON.stringify({
    id: 'SY-99214-IN',
    name: 'Aarav Sharma',
    blood: 'B+',
    emergency: '+91 98765 43211',
    valid: '2025-10-28',
    authHash: 'e7a9c2b4f108d'
  })
};

export const INITIAL_SOS_ALERTS: SosAlert[] = [
  {
    id: 'SOS-84920',
    touristId: 'SY-84920',
    touristName: 'Priya Sharma',
    touristPhone: '+91 98112 40912',
    timestamp: new Date(Date.now() - 105 * 1000).toISOString(),
    status: 'triggered',
    severity: 'critical',
    location: {
      lat: 32.2472,
      lng: 77.1852,
      altitude: 2150,
      accuracy: 4,
      address: 'Ridge Trail Z3, Upper Old Manali',
      sector: 'Sector 3 - High Ravine'
    },
    batteryLevel: 18,
    pulseBpm: 134,
    impactG: 4.2,
    altitudeM: 2150,
    notes: 'Tourist accelerometer registered abrupt 4.2G impact followed by rapid SOS pulse. Tourist pulse rate reported at 134 bpm via companion biometric bridge.'
  },
  {
    id: 'SOS-39102',
    touristId: 'SY-39102',
    touristName: 'David Miller',
    touristPhone: '+1 415 555 0192',
    timestamp: new Date(Date.now() - 375 * 1000).toISOString(),
    status: 'assigned',
    severity: 'priority',
    location: {
      lat: 32.2341,
      lng: 77.1945,
      altitude: 1980,
      accuracy: 6,
      address: 'Jogini Waterfalls Descent Trail',
      sector: 'Sector 2 - Waterfall Track'
    },
    batteryLevel: 64,
    altitudeM: 1980,
    notes: 'Ankle sprain reported on steep wet descent. Tourist immobilized near prayer flag crossing.',
    assignedUnit: {
      id: 'UNIT-ALPHA-2',
      name: 'Unit Alpha-2 (Mountain Rescue)',
      officer: 'Sandeep K. (Sub-Inspector)',
      etaMinutes: 4,
      distanceMeters: 850,
      phone: '+91 94180 11202'
    },
    acknowledgedAt: new Date(Date.now() - 320 * 1000).toISOString()
  },
  {
    id: 'SOS-11849',
    touristId: 'SY-11849',
    touristName: 'Ananya Sen',
    touristPhone: '+91 98200 44910',
    timestamp: new Date(Date.now() - 720 * 1000).toISOString(),
    status: 'acknowledged',
    severity: 'advisory',
    location: {
      lat: 32.2215,
      lng: 77.1780,
      altitude: 2040,
      accuracy: 8,
      address: 'Unmarked Ravine Ridge, South Sector',
      sector: 'Sector 4 - Restricted Ravine'
    },
    batteryLevel: 42,
    altitudeM: 2040,
    notes: 'Boundary breach alert: Tourist deviated 420m south from registered safe track towards unstable rock ledge. Auto-warning push SMS delivered.',
    acknowledgedAt: new Date(Date.now() - 600 * 1000).toISOString()
  }
];

export const INITIAL_RISK_ZONES: RiskZone[] = [
  {
    id: 'ZONE-CONFIRMED-RED',
    name: 'Upper Beas Ravine Cliffside',
    category: 'ravine',
    riskLevel: 'high',
    source: 'authority_confirmed',
    coordinates: [
      [32.2530, 77.1780],
      [32.2560, 77.1910],
      [32.2470, 77.1890],
      [32.2440, 77.1790]
    ],
    center: [32.2500, 77.1840],
    areaSqKm: 1.4,
    activeTouristsCount: 14,
    advisoryText: 'Active rockfall hazard. High slope gradient >45°. Entry restricted after 17:00 IST.',
    lastUpdated: 'Today at 03:40 UTC'
  },
  {
    id: 'ZONE-AI-RAVINE',
    name: 'Sector 3 Micro-Fissure Slope (AI Predicted)',
    category: 'landslide',
    riskLevel: 'high',
    source: 'ai_suggested',
    coordinates: [
      [32.2490, 77.1950],
      [32.2540, 77.2080],
      [32.2450, 77.2130],
      [32.2410, 77.2000]
    ],
    center: [32.2470, 77.2040],
    areaSqKm: 2.1,
    confidenceScore: 94.2,
    activeTouristsCount: 128,
    advisoryText: 'Monsoon saturation reached 84%. Sensor #RB-12 detected micro-fissure expansion (1.2mm/h). Geofence boundary auto-expanded by 350m.',
    lastUpdated: '12 mins ago via INSAT-3DR Telemetry'
  },
  {
    id: 'ZONE-AMBER-SLOPE',
    name: 'Solang Upper Ridge Wind Corridor',
    category: 'dense_fog',
    riskLevel: 'medium',
    source: 'authority_confirmed',
    coordinates: [
      [32.2350, 77.2010],
      [32.2420, 77.2180],
      [32.2310, 77.2250],
      [32.2260, 77.2080]
    ],
    center: [32.2335, 77.2130],
    areaSqKm: 3.2,
    activeTouristsCount: 32,
    advisoryText: 'Sudden gusts exceeding 55 km/h with low visibility cloud inversions. Trekking sticks required.',
    lastUpdated: 'Today at 02:15 UTC'
  },
  {
    id: 'ZONE-SAFE-CORRIDOR',
    name: 'Mall Road - Hadimba Verified Safe Corridor',
    category: 'safe_corridor',
    riskLevel: 'low',
    source: 'authority_confirmed',
    coordinates: [
      [32.2320, 77.1720],
      [32.2410, 77.1770],
      [32.2390, 77.1890],
      [32.2270, 77.1820]
    ],
    center: [32.2340, 77.1800],
    areaSqKm: 1.8,
    activeTouristsCount: 84,
    advisoryText: 'Designated safe pedestrian and transport corridor. Patrolled every 15 minutes by Municipal tourist marshals.',
    lastUpdated: 'Active 24/7'
  }
];

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: 'INC-2025-081',
    title: 'Trail Washout at Vashisht North Footbridge',
    type: 'washout',
    severity: 'high',
    status: 'dispatched',
    location: {
      lat: 32.2512,
      lng: 77.1921,
      address: 'Vashisht Riverbed Footpath, Km 2.4',
      sector: 'Sector 2'
    },
    reportedBy: 'Local Trek Guide (Permit #TG-401)',
    reportedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    description: 'Swollen tributary eroded approximately 12 meters of footway. Footbridge support timber shifted. 4 foreign tourists safely diverted.',
    assignedResponder: 'Unit Alpha-2'
  },
  {
    id: 'INC-2025-082',
    title: 'Himalayan Black Bear Sighting near Hadimba Grove',
    type: 'wildlife',
    severity: 'medium',
    status: 'investigating',
    location: {
      lat: 32.2435,
      lng: 77.1740,
      address: 'Deodar Forest Trail, 200m from Hadimba Temple',
      sector: 'Sector 1'
    },
    reportedBy: 'Tourist Aarav Sharma',
    reportedAt: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    description: 'Adult bear spotted foraging near orchard fence line. Forest patrol notified to clear pedestrian path and deploy sound flares.'
  },
  {
    id: 'INC-2025-083',
    title: 'Minor Rockslide on Rohtang Bypass Spur',
    type: 'rockslide',
    severity: 'high',
    status: 'dispatched',
    location: {
      lat: 32.2590,
      lng: 77.1865,
      address: 'NH-3 Upper Spur Cut, Marker 41/2',
      sector: 'Sector 3'
    },
    reportedBy: 'Himachal Road Transport Driver',
    reportedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    description: 'Boulders blocked single lane. Road clearing machinery dispatched from Kothi depot.'
  },
  {
    id: 'INC-2025-084',
    title: 'Severe Dehydration & Altitude Sickness',
    type: 'medical',
    severity: 'high',
    status: 'resolved',
    location: {
      lat: 32.2488,
      lng: 77.1830,
      address: 'Old Manali High Meadow Campsite',
      sector: 'Sector 3'
    },
    reportedBy: 'Camp Organizer',
    reportedAt: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
    description: 'Tourist administered supplemental oxygen by Mountain Paramedic Team. Evacuated to Manali Civil Hospital, now stabilized.'
  }
];

export const INITIAL_PATROL_UNITS: PatrolUnit[] = [
  {
    id: 'UNIT-ALPHA-2',
    name: 'Unit Alpha-2 (Mountain Rescue)',
    callsign: 'A2',
    sector: 'Manali North & Jogini',
    status: 'dispatched',
    officers: ['Sandeep Kumar (SI)', 'Tenzing N. (Rescue Tech)'],
    currentSpeedKmH: 34,
    location: [32.2380, 77.1910],
    batteryLevel: 88,
    assignedIncidentId: 'SOS-39102'
  },
  {
    id: 'UNIT-PATROL-4',
    name: 'Patrol Team 4 (St. John High-Camp)',
    callsign: 'T4',
    sector: 'Old Manali & Hadimba Ridge',
    status: 'idle',
    officers: ['Vikram Thakur (Head Constable)', 'Rajesh S.'],
    currentSpeedKmH: 0,
    location: [32.2480, 77.1770],
    batteryLevel: 94
  },
  {
    id: 'UNIT-BRAVO-1',
    name: 'Unit Bravo-1 (Solang Valley Rapid Patrol)',
    callsign: 'B1',
    sector: 'Solang & Rohtang Approach',
    status: 'patrolling',
    officers: ['Pooja Negi (Officer)', 'Arun Verma'],
    currentSpeedKmH: 28,
    location: [32.2310, 77.2050],
    batteryLevel: 76
  }
];

export const EMERGENCY_HELPLINES: EmergencyHelpline[] = [
  {
    id: 'line-112',
    name: 'National Emergency Response Support System (ERSS)',
    department: 'Ministry of Home Affairs (Govt. of India)',
    number: '112',
    description: 'All-in-one national unified emergency number for Police, Fire, Ambulance, and Disaster with live GPS location dispatch.',
    category: 'national',
    icon: 'local_police',
    availability: '24x7 Toll-Free All India'
  },
  {
    id: 'line-1363',
    name: 'Incredible India Tourist Helpline',
    department: 'Ministry of Tourism (Govt. of India)',
    number: '1363',
    description: '24x7 multi-lingual tourist assistance and guidance in 12 international languages (English, Hindi, German, French, Spanish, Japanese, Russian, Italian, etc.).',
    category: 'national',
    icon: 'translate',
    availability: '24x7 Toll-Free (1363 / 1800-11-1363)'
  },
  {
    id: 'line-1070',
    name: 'National Disaster Management Authority (NDMA)',
    department: 'Ministry of Home Affairs (Govt. of India)',
    number: '1070',
    description: 'Central disaster response hotline for severe cyclones, flash floods, earthquakes, landslides, and national rescue coordination.',
    category: 'mountain_rescue',
    icon: 'downhill_skiing',
    availability: '24x7 Central Disaster Control Room'
  },
  {
    id: 'line-108',
    name: 'National Health Mission Emergency Ambulance',
    department: 'Ministry of Health & Family Welfare (Govt. of India)',
    number: '108',
    description: 'Emergency medical life support and ALS/BLS ambulance dispatch with paramedic care across India.',
    category: 'medical',
    icon: 'medical_services',
    availability: '24x7 Toll-Free Medical Support'
  },
  {
    id: 'line-1091',
    name: 'National Women Safety & Distress Helpline',
    department: 'National Commission for Women / MWCD (Govt. of India)',
    number: '1091',
    description: 'Immediate police intervention, transit safety escort, emergency shelter, and legal/psychological support for women travelers.',
    category: 'women_safety',
    icon: 'woman',
    availability: '24x7 Nationwide Priority Line'
  },
  {
    id: 'line-139',
    name: 'Rail Madad - Railway Security & Medical Helpline',
    department: 'Ministry of Railways (Govt. of India)',
    number: '139',
    description: 'Unified national railway passenger emergency, security, medical aid on moving trains, and theft/crime reporting.',
    category: 'national',
    icon: 'train',
    availability: '24x7 Nationwide Railways'
  },
  {
    id: 'line-1930',
    name: 'National Cyber Crime Reporting Portal',
    department: 'Indian Cyber Crime Coordination Centre (I4C), MHA',
    number: '1930',
    description: 'Immediate financial cyber fraud freeze, travel booking scams, and digital identity extortion reporting.',
    category: 'national',
    icon: 'shield',
    availability: '24x7 National Helpline'
  },
  {
    id: 'line-1098',
    name: 'Childline National Emergency',
    department: 'Ministry of Women and Child Development (Govt. of India)',
    number: '1098',
    description: '24-hour nationwide emergency service for children in need of aid and protection, lost children at tourist hubs.',
    category: 'national',
    icon: 'child_care',
    availability: '24x7 Toll-Free'
  }
];
