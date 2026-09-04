require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

const { connectDB, closeDB } = require('./utils/db');
const User = require('./models/User');
const Tourist = require('./models/Tourist');
const TouristProfile = require('./models/TouristProfile');
const DigitalTouristID = require('./models/DigitalTouristID');
const RiskZone = require('./models/RiskZone');
const Incident = require('./models/Incident');
const SOSAlert = require('./models/SOSAlert');
const LocationPing = require('./models/LocationPing');
const SafetyResource = require('./models/SafetyResource');
const ResponseUnit = require('./models/ResponseUnit');
const VerificationLog = require('./models/VerificationLog');
const { classifyIncidentOrSOS } = require('./utils/aiClassifier');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const createCirclePolygonCoordinates = (centerLat, centerLng, radiusMeters) => {
  const points = 12;
  const coordinates = [];
  const radiusDegLat = radiusMeters / 111320;
  const radiusDegLng = radiusMeters / (111320 * Math.cos((centerLat * Math.PI) / 180));

  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const lng = centerLng + radiusDegLng * Math.sin(angle);
    const lat = centerLat + radiusDegLat * Math.cos(angle);
    coordinates.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
  }

  return [coordinates];
};

const populateData = async ({ clearExisting = false } = {}) => {
  try {
    if (clearExisting) {
      await Promise.all([
        User.deleteMany({}),
        Tourist.deleteMany({}),
        TouristProfile.deleteMany({}),
        DigitalTouristID.deleteMany({}),
        RiskZone.deleteMany({}),
        Incident.deleteMany({}),
        SOSAlert.deleteMany({}),
        LocationPing.deleteMany({}),
        SafetyResource.deleteMany({}),
        ResponseUnit.deleteMany({}),
        VerificationLog.deleteMany({})
      ]);
      console.log('🧹 Cleared existing database records.');
    }

    const defaultPasswordHash = await hashPassword('Password123!');

    // 1. Create Authority, Dispatcher & Admin Users
    const adminUser = await User.create({
      name: 'Chief Commissioner Rajesh Varma',
      email: 'admin@safety.gov',
      passwordHash: defaultPasswordHash,
      role: 'admin',
      zone: 'Central Zone',
      jurisdiction: 'Central Zone',
      badgeNumber: 'ADMIN-001',
      phone: '+91-9876500001',
      nationality: 'Indian'
    });

    const dispatcherUser = await User.create({
      name: 'Dispatcher Kavita Sen',
      email: 'dispatcher.kavita@safety.gov',
      passwordHash: defaultPasswordHash,
      role: 'dispatcher',
      zone: 'Central Zone',
      jurisdiction: 'Central Zone',
      badgeNumber: 'DISP-104',
      phone: '+91-9876500002',
      nationality: 'Indian'
    });

    const authority1 = await User.create({
      name: 'Inspector Vikram Rao',
      email: 'officer.vikram@safety.gov',
      passwordHash: defaultPasswordHash,
      role: 'authority',
      zone: 'Central Zone',
      jurisdiction: 'Central Zone',
      badgeNumber: 'AUTH-201',
      phone: '+91-9876543210',
      nationality: 'Indian'
    });

    const authority2 = await User.create({
      name: 'Officer Sarah Jenkins',
      email: 'officer.sarah@police.gov',
      passwordHash: defaultPasswordHash,
      role: 'authority',
      zone: 'Coastal Sector',
      jurisdiction: 'Coastal Sector',
      badgeNumber: 'AUTH-305',
      phone: '+1-555-0100',
      nationality: 'American'
    });

    console.log('✅ Seeded Admin, Dispatcher, and Authority Officers');

    // 2. Create Tourists
    const tourist1 = await User.create({
      name: 'Maya Lin',
      email: 'maya.lin@gmail.com',
      passwordHash: defaultPasswordHash,
      role: 'tourist',
      phone: '+1-555-0199',
      nationality: 'Canadian'
    });

    const tourist2 = await User.create({
      name: 'Carlos Gomez',
      email: 'carlos.gomez@yahoo.es',
      passwordHash: defaultPasswordHash,
      role: 'tourist',
      phone: '+34-600-112233',
      nationality: 'Spanish'
    });

    const tourist3 = await User.create({
      name: 'Emily Watson',
      email: 'emily.watson@outlook.co.uk',
      passwordHash: defaultPasswordHash,
      role: 'tourist',
      phone: '+44-770-900123',
      nationality: 'British'
    });

    console.log('✅ Seeded 3 Tourists');

    // 3. Create Tourist Profiles
    await TouristProfile.create({
      userId: tourist1._id,
      passportOrIdNumber: 'CAN-8921894',
      emergencyContacts: [
        { name: 'David Lin', phone: '+1-555-0198', relation: 'Father' },
        { name: 'Chloe Lin', phone: '+1-555-0197', relation: 'Sister' }
      ],
      medicalInfo: {
        allergies: ['Penicillin', 'Peanuts'],
        conditions: ['Mild Asthma'],
        bloodGroup: 'O+'
      },
      itinerary: [
        {
          location: 'Old City Cultural Heritage District',
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-09-07'),
          notes: 'Grand Hotel room 402'
        },
        {
          location: 'Cliffside National Park',
          startDate: new Date('2026-09-08'),
          endDate: new Date('2026-09-12'),
          notes: 'Coastal eco-resort'
        }
      ],
      travelDocumentsMeta: {
        visaNumber: 'V-9988221A',
        insuranceProvider: 'Global Allianz Travel Guard',
        insurancePolicyNumber: 'POL-CAN-771120',
        primaryHotel: 'The Heritage Palace, Room 402'
      }
    });

    await TouristProfile.create({
      userId: tourist2._id,
      passportOrIdNumber: 'ESP-5512398',
      emergencyContacts: [
        { name: 'Elena Gomez', phone: '+34-600-998877', relation: 'Spouse' }
      ],
      medicalInfo: {
        allergies: ['Bee Stings', 'Sulfa drugs'],
        conditions: [],
        bloodGroup: 'A-'
      },
      itinerary: [
        {
          location: 'Downtown Promenade & Night Market',
          startDate: new Date('2026-09-03'),
          endDate: new Date('2026-09-10'),
          notes: 'City Center Inn'
        }
      ],
      travelDocumentsMeta: {
        insuranceProvider: 'Mapfre Travel Assist',
        insurancePolicyNumber: 'ESP-984411'
      }
    });

    console.log('✅ Seeded Tourist Profiles (Medical, Emergency Contacts, Itineraries)');

    // 4. Generate Digital Tourist IDs with Signed QR Codes
    const secret = process.env.DIGITAL_ID_SECRET || process.env.JWT_SECRET || 'digital_id_signing_secret_tourist_2026_q78';
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const tokenPayload1 = {
      type: 'DIGITAL_TOURIST_ID',
      touristId: tourist1._id.toString(),
      name: tourist1.name,
      nationality: tourist1.nationality,
      bloodGroup: 'O+',
      allergies: ['Penicillin', 'Peanuts'],
      emergencyContacts: [{ name: 'David Lin', phone: '+1-555-0198', relation: 'Father' }],
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    const signedToken1 = jwt.sign(tokenPayload1, secret, { expiresIn: '30d' });
    const qrImage1 = await QRCode.toDataURL(signedToken1, { errorCorrectionLevel: 'H' });

    await DigitalTouristID.create({
      userId: tourist1._id,
      qrCodePayload: signedToken1,
      qrCodeImage: qrImage1,
      issuedAt: new Date(),
      expiresAt,
      status: 'active'
    });

    // Seed shared MongoDB Tourist collection documents
    await Tourist.create({
      _id: tourist1._id,
      name: tourist1.name,
      email: tourist1.email,
      passwordHash: defaultPasswordHash,
      nationality: tourist1.nationality,
      passportNumber: 'CAN-8921894',
      phone: tourist1.phone,
      emergencyContact: { name: 'David Lin', phone: '+1-555-0198', relation: 'Father' },
      itinerary: [
        {
          location: 'Old City Cultural Heritage District',
          startDate: new Date('2026-09-01'),
          endDate: new Date('2026-09-07'),
          notes: 'Grand Hotel room 402'
        }
      ],
      medicalNotes: {
        bloodGroup: 'O+',
        allergies: ['Penicillin', 'Peanuts'],
        conditions: ['Mild Asthma'],
        notes: 'Asthma inhaler in daypack'
      },
      digitalIdToken: signedToken1,
      digitalIdExpiry: expiresAt,
      tripDates: {
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-15')
      },
      accommodation: 'Grand Heritage Hotel, Room 402',
      preferredLanguage: 'en'
    });

    await Tourist.create({
      _id: tourist2._id,
      name: tourist2.name,
      email: tourist2.email,
      passwordHash: defaultPasswordHash,
      nationality: tourist2.nationality,
      passportNumber: 'ESP-6712390',
      phone: tourist2.phone,
      emergencyContact: { name: 'Elena Gomez', phone: '+34-600-998877', relation: 'Spouse' },
      itinerary: [
        {
          location: 'Downtown Promenade & Night Market',
          startDate: new Date('2026-09-03'),
          endDate: new Date('2026-09-10'),
          notes: 'City Center Inn'
        }
      ],
      medicalNotes: {
        bloodGroup: 'A-',
        allergies: ['Bee Stings', 'Sulfa drugs'],
        conditions: [],
        notes: ''
      },
      tripDates: {
        startDate: new Date('2026-09-03'),
        endDate: new Date('2026-09-12')
      },
      accommodation: 'City Center Inn',
      preferredLanguage: 'es'
    });

    await Tourist.create({
      _id: tourist3._id,
      name: tourist3.name,
      email: tourist3.email,
      passwordHash: defaultPasswordHash,
      nationality: tourist3.nationality,
      passportNumber: 'GBR-3329011',
      phone: tourist3.phone,
      emergencyContact: { name: 'Arthur Watson', phone: '+44-770-900999', relation: 'Brother' },
      itinerary: [
        {
          location: 'Botanical Gardens & Riverside Walk',
          startDate: new Date('2026-09-04'),
          endDate: new Date('2026-09-09')
        }
      ],
      medicalNotes: {
        bloodGroup: 'B+',
        allergies: [],
        conditions: ['Diabetes Type 2'],
        notes: 'Carries insulin'
      },
      tripDates: {
        startDate: new Date('2026-09-04'),
        endDate: new Date('2026-09-14')
      },
      accommodation: 'Riverside Boutique Lodge',
      preferredLanguage: 'en'
    });

    console.log('✅ Seeded Tourist collection documents (shared MongoDB contract)');
    console.log('✅ Seeded Signed Digital Tourist ID with QR Image');

    // 5. Seed Geospatial Risk Zones (Coordinates around center lat: 12.9716, lng: 77.5946)
    const riskZone1 = await RiskZone.create({
      name: 'Old Bazaar Alleyways & Backstreets',
      description: 'High rate of organized pickpocketing, purse snatching, and distraction scams after dark.',
      riskLevel: 'high',
      category: 'crime',
      center: { lat: 12.9716, lng: 77.5946 },
      radiusMeters: 650,
      location: {
        type: 'Polygon',
        coordinates: createCirclePolygonCoordinates(12.9716, 77.5946, 650)
      },
      active: true,
      createdBy: authority1._id,
      incidentCount: 5,
      aiRiskScore: 78
    });

    const riskZone2 = await RiskZone.create({
      name: 'Cliffside Coastal Trail Ravine',
      description: 'Dangerous slippery terrain, unstable cliff edges, and flash surge warnings during monsoon season.',
      riskLevel: 'critical',
      category: 'natural_hazard',
      center: { lat: 12.9800, lng: 77.6050 },
      radiusMeters: 800,
      location: {
        type: 'Polygon',
        coordinates: createCirclePolygonCoordinates(12.9800, 77.6050, 800)
      },
      active: true,
      createdBy: authority1._id,
      incidentCount: 3,
      aiRiskScore: 88
    });

    const riskZone3 = await RiskZone.create({
      name: 'Freedom Square Protest Corridor',
      description: 'Frequent political gatherings, traffic standstills, and volatile public demonstrations.',
      riskLevel: 'medium',
      category: 'political_unrest',
      center: { lat: 12.9640, lng: 77.5850 },
      radiusMeters: 500,
      location: {
        type: 'Polygon',
        coordinates: createCirclePolygonCoordinates(12.9640, 77.5850, 500)
      },
      active: true,
      createdBy: authority2._id,
      incidentCount: 2,
      aiRiskScore: 42
    });

    console.log('✅ Seeded 3 2dsphere Geospatial Risk Zones');

    // 6. Seed Incidents for AI Spatial Clustering & Severity Classifier
    const sampleIncidents = [
      {
        reportedBy: tourist1._id,
        type: 'theft',
        description: 'Pickpockets stole my wallet and credit cards while in the crowded spice market corridor.',
        location: { lat: 12.9718, lng: 77.5948, address: 'Old Bazaar Spice Market' },
        severity: 'medium',
        daysAgo: 1
      },
      {
        reportedBy: tourist2._id,
        type: 'assault',
        description: 'Two men approached with a knife demanding bags and money. Threatened with physical violence!',
        location: { lat: 12.9714, lng: 77.5942, address: 'Old Bazaar South Lane' },
        severity: 'critical',
        daysAgo: 2
      },
      {
        reportedBy: tourist1._id,
        type: 'theft',
        description: 'Motorbike rider snatched purse off shoulder while waiting for taxi.',
        location: { lat: 12.9720, lng: 77.5950, address: 'Bazaar Crossroad #4' },
        severity: 'high',
        daysAgo: 4
      },
      {
        reportedBy: tourist3._id,
        type: 'harassment',
        description: 'Group of aggressive touts surrounded us and followed us shouting threats for 10 minutes.',
        location: { lat: 12.9712, lng: 77.5940, address: 'Old Bazaar North Gate' },
        severity: 'medium',
        daysAgo: 5
      },
      {
        reportedBy: tourist2._id,
        type: 'hazard',
        description: 'Tourist slipped on loose wet rocks near cliff edge and fractured ankle, emergency assistance needed.',
        location: { lat: 12.9802, lng: 77.6052, address: 'Cliffside Mile Marker 3' },
        severity: 'critical',
        daysAgo: 3
      },
      {
        reportedBy: tourist3._id,
        type: 'scam',
        description: 'Currency exchange shop gave counterfeit notes and refused refund.',
        location: { lat: 12.9642, lng: 77.5852, address: 'Square Commercial Arcade' },
        severity: 'low',
        daysAgo: 6
      }
    ];

    for (const inc of sampleIncidents) {
      const aiAnalysis = await classifyIncidentOrSOS(inc.description, inc.type);
      const createdAtDate = new Date(Date.now() - inc.daysAgo * 24 * 60 * 60 * 1000);

      await Incident.create({
        reportedBy: inc.reportedBy,
        type: inc.type,
        description: inc.description,
        location: {
          lat: inc.location.lat,
          lng: inc.location.lng,
          address: inc.location.address
        },
        geoPoint: {
          type: 'Point',
          coordinates: [inc.location.lng, inc.location.lat]
        },
        severity: inc.severity,
        status: inc.daysAgo <= 2 ? 'open' : 'investigating',
        mediaUrls: [],
        aiAnalysis: {
          predictedSeverity: aiAnalysis.predictedSeverity,
          urgencyScore: aiAnalysis.urgencyScore,
          detectedKeywords: aiAnalysis.detectedKeywords,
          suggestedAction: aiAnalysis.suggestedAction,
          confidence: aiAnalysis.confidence,
          explanation: aiAnalysis.explanation,
          analyzedAt: createdAtDate
        },
        createdAt: createdAtDate
      });
    }

    console.log('✅ Seeded 6 Historical Incidents with AI Urgency Scores for Spatial Clustering');

    // 7. Seed Location Pings (Maya Lin inside Old Bazaar zone, Carlos outside)
    await LocationPing.create({
      touristId: tourist1._id,
      location: { lat: 12.9716, lng: 77.5946 }, // Exactly inside riskZone1!
      geoPoint: { type: 'Point', coordinates: [77.5946, 12.9716] },
      activeRiskZones: [riskZone1._id],
      batteryLevel: 74,
      speed: 1.2,
      timestamp: new Date()
    });

    await LocationPing.create({
      touristId: tourist2._id,
      location: { lat: 12.9550, lng: 77.5700 }, // Safe zone
      geoPoint: { type: 'Point', coordinates: [77.5700, 12.9550] },
      activeRiskZones: [],
      batteryLevel: 92,
      speed: 0.0,
      timestamp: new Date()
    });

    console.log('✅ Seeded Location Pings (1 Tourist currently located inside high-risk zone)');

    // 8. Seed Response Units
    const unit1 = await ResponseUnit.create({
      unitId: 'PATROL-101',
      name: 'Central Police Quick Reaction Patrol #101',
      type: 'police_patrol',
      zone: 'Central Zone',
      status: 'available',
      currentLocation: { lat: 12.9716, lng: 77.5946, address: 'Central Police Station HQ' },
      contactNumber: '+91-80-2294-0101',
      callSign: 'EAGLE-ONE'
    });

    const unit2 = await ResponseUnit.create({
      unitId: 'PATROL-102',
      name: 'Coastal Sector Marine & Beach Patrol #102',
      type: 'police_patrol',
      zone: 'Coastal Sector',
      status: 'available',
      currentLocation: { lat: 12.9800, lng: 77.6050, address: 'Harbor Gate Pier 2' },
      contactNumber: '+91-80-2294-0102',
      callSign: 'COASTAL-TWO'
    });

    const unit3 = await ResponseUnit.create({
      unitId: 'MED-204',
      name: 'City Trauma & Paramedic Ambulance #204',
      type: 'medical_trauma',
      zone: 'Central Zone',
      status: 'available',
      currentLocation: { lat: 12.9690, lng: 77.5900, address: 'City General Trauma Care' },
      contactNumber: '+91-80-2294-0204',
      callSign: 'LIFE-GUARD'
    });

    const unit4 = await ResponseUnit.create({
      unitId: 'TOURIST-HELP-01',
      name: 'Tourism Department Multilingual Help Van #01',
      type: 'tourism_helpline',
      zone: 'Central Zone',
      status: 'available',
      currentLocation: { lat: 12.9750, lng: 77.5980, address: 'Heritage Promenade Kiosk' },
      contactNumber: '+91-80-2294-0999',
      callSign: 'GUIDE-VAN'
    });

    console.log('✅ Seeded 4 Emergency Response Units (Police, Medical, Tourist Help)');

    // 9. Seed Active SOS Alerts
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const sosAlert1 = await SOSAlert.create({
      touristId: tourist1._id,
      location: { lat: 12.9716, lng: 77.5946 },
      geoPoint: { type: 'Point', coordinates: [77.5946, 12.9716] },
      message: 'Help! Followed by armed group down dark alleyway. Send immediate police assistance!',
      status: 'active',
      severity: 'critical',
      priorityScore: 10,
      triggeredAt: threeMinutesAgo,
      createdAt: threeMinutesAgo
    });

    const sosAlert2 = await SOSAlert.create({
      touristId: tourist2._id,
      location: { lat: 12.9550, lng: 77.5700 },
      geoPoint: { type: 'Point', coordinates: [77.5700, 12.9550] },
      message: 'Medical emergency: Tourist fell on slippery steps near hotel and suffered compound fracture.',
      status: 'acknowledged',
      severity: 'high',
      priorityScore: 8,
      acknowledgedBy: authority1._id,
      respondingAuthorityId: authority1._id,
      acknowledgedAt: new Date(Date.now() - 5 * 60 * 1000),
      triggeredAt: tenMinutesAgo,
      createdAt: tenMinutesAgo
    });

    console.log('✅ Seeded 2 Active Emergency SOS Alerts (Critical & High)');

    // 10. Seed Verification Audit Logs
    await VerificationLog.create({
      officerId: authority1._id,
      touristId: tourist1._id,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      location: {
        lat: 12.9716,
        lng: 77.5946,
        address: 'Old Bazaar Police Post #3',
        zone: 'Central Zone'
      },
      result: 'verified',
      verificationMethod: 'qr_scan',
      notes: 'Routine evening patrol identity verification; traveler in possession of active digital QR pass.'
    });

    await VerificationLog.create({
      officerId: authority1._id,
      touristId: tourist2._id,
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      location: {
        lat: 12.9550,
        lng: 77.5700,
        address: 'Heritage Palace Information Booth',
        zone: 'Central Zone'
      },
      result: 'verified',
      verificationMethod: 'manual_lookup',
      notes: 'Manual passport & digital pass lookup upon tourist inquiry.'
    });

    await VerificationLog.create({
      officerId: authority2._id,
      touristId: null,
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      location: {
        lat: 12.9800,
        lng: 77.6050,
        address: 'Harbor Gate Security Pier',
        zone: 'Coastal Sector'
      },
      result: 'invalid',
      verificationMethod: 'qr_scan',
      reason: 'Expired QR token presented by unauthorized visitor'
    });

    console.log('✅ Seeded 3 Verification Audit Logs (Scans & Lookups)');

    // 11. Seed Safety Resources
    await SafetyResource.create({
      region: 'bengaluru',
      displayName: 'Bengaluru Metropolitan Safety Resources',
      emergencyContacts: [
        { label: 'Tourist Police Helpdesk (24x7)', number: '+91-80-2294-2222', available24x7: true },
        { label: 'State Emergency Response Support (ERSS)', number: '112', available24x7: true },
        { label: 'Ambulance Trauma Helpline', number: '108', available24x7: true },
        { label: 'Women Safety Helpline', number: '1091', available24x7: true }
      ],
      guidelines: [
        {
          title: 'Verify Licensed Tourist Taxis',
          body: 'Only board registered app-cabs or government pre-paid taxi booths with metered tariffs.',
          category: 'transport'
        },
        {
          title: 'Night Travel Advisory',
          body: 'Avoid isolated backstreets in the Old Bazaar area after 10:00 PM; use designated brightly lit arterial roads.',
          category: 'crime_prevention'
        },
        {
          title: 'Emergency Medical Precaution',
          body: 'Keep your digital tourist QR code handy; emergency medics scan it to immediately read blood group and allergy disclosures.',
          category: 'medical'
        }
      ],
      embassyContacts: [
        {
          country: 'United States',
          phone: '+91-44-2857-4000',
          address: 'US Consulate General, Chennai (Bengaluru Consular District)',
          email: 'chennaics@state.gov'
        },
        {
          country: 'United Kingdom',
          phone: '+91-80-2210-0200',
          address: 'British Deputy High Commission, Bengaluru',
          email: 'bengaluru.consular@fcdo.gov.uk'
        },
        {
          country: 'Canada',
          phone: '+91-80-6765-6300',
          address: 'Consulate of Canada, World Trade Center, Bengaluru',
          email: 'bnglr-consular@international.gc.ca'
        }
      ]
    });

    await SafetyResource.create({
      region: 'general',
      displayName: 'Universal International Tourist Safety Guidelines',
      emergencyContacts: [
        { label: 'Unified International Emergency Number', number: '112', available24x7: true },
        { label: 'Interpol Red Notice Tourist Liaison', number: '+33-4-72-44-70-00', available24x7: true }
      ],
      guidelines: [
        {
          title: 'Keep Digital ID Cached Offline',
          body: 'Download your signed Digital Tourist ID QR code to your phone gallery so authorities can verify identity without internet access.',
          category: 'identity'
        },
        {
          title: 'One-Tap SOS Dispatch',
          body: 'Tapping the SOS emergency button immediately dispatches your real-time GPS coordinates and medical details to the local police headquarters.',
          category: 'emergency'
        }
      ],
      embassyContacts: []
    });

    console.log('✅ Seeded Regional & Universal Safety Resources');

    console.log('\n====================================================');
    console.log('🎉 SEEDING COMPLETE! Ready for immediate demonstration.');
    console.log('----------------------------------------------------');
    console.log('👑 Admin User:');
    console.log('   Email:    admin@safety.gov');
    console.log('   Password: Password123!');
    console.log('   Role:     admin (Zone: Central Zone)');
    console.log('----------------------------------------------------');
    console.log('📡 Dispatcher User:');
    console.log('   Email:    dispatcher.kavita@safety.gov');
    console.log('   Password: Password123!');
    console.log('   Role:     dispatcher (Zone: Central Zone)');
    console.log('----------------------------------------------------');
    console.log('👮 Authority Officer:');
    console.log('   Email:    officer.vikram@safety.gov');
    console.log('   Password: Password123!');
    console.log('   Role:     authority (Zone: Central Zone)');
    console.log('----------------------------------------------------');
    console.log('👤 Tourist User:');
    console.log('   Email:    maya.lin@gmail.com');
    console.log('   Password: Password123!');
    console.log('   Role:     tourist');
    console.log('====================================================');
    return true;
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    throw err;
  }
};

const seed = async () => {
  try {
    console.log('🌱 Starting database seeding for Tourist Safety Platform...');
    await connectDB();
    await populateData({ clearExisting: true });
    await closeDB();
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
};

if (require.main === module) {
  seed();
}

module.exports = { seed, populateData };

