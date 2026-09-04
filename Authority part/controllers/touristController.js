const TouristProfile = require('../models/TouristProfile');
const Tourist = require('../models/Tourist');
const User = require('../models/User');
const DigitalTouristID = require('../models/DigitalTouristID');
const SOSAlert = require('../models/SOSAlert');
const LocationPing = require('../models/LocationPing');
const SafetyResource = require('../models/SafetyResource');
const { haversineDistanceMeters } = require('../utils/geoUtils');
const { AppError } = require('../middleware/errorHandler');

// Reference static emergency resources & nearby facilities
const DEFAULT_FACILITIES = [
  {
    type: 'police_station',
    name: 'Tourist Police Headquarters & Station',
    phone: '+91-11-23344556',
    address: 'Connaught Place Police Post, Inner Circle',
    location: { lat: 28.6315, lng: 77.2167 },
    open24x7: true
  },
  {
    type: 'police_station',
    name: 'Metro City Tourist Assistance Bureau',
    phone: '112',
    address: 'Civic Centre Police Station, 4th Floor',
    location: { lat: 12.9716, lng: 77.5946 },
    open24x7: true
  },
  {
    type: 'hospital',
    name: 'Apollo International Emergency Medical Center',
    phone: '+91-11-26925858',
    address: 'Sarita Vihar, Mathura Road',
    location: { lat: 28.5355, lng: 77.2882 },
    traumaCenter: true,
    open24x7: true
  },
  {
    type: 'hospital',
    name: 'St. John Trauma Care & Multi-Specialty Hospital',
    phone: '+91-80-22065000',
    address: 'Sarjapur Main Road, Koramangala',
    location: { lat: 12.9344, lng: 77.6200 },
    traumaCenter: true,
    open24x7: true
  }
];

const EMBASSY_DIRECTORY = {
  canada: {
    country: 'Canada',
    embassyName: 'High Commission of Canada',
    phone: '+91-11-4178-2000',
    emergencyHelpline: '+1-613-996-8885 (24/7 Ottawa Emergency Watch)',
    email: 'delhi.consular@international.gc.ca',
    address: '7/8 Shantipath, Chanakyapuri, New Delhi'
  },
  usa: {
    country: 'United States of America',
    embassyName: 'Embassy of the United States',
    phone: '+91-11-2419-8000',
    emergencyHelpline: '+1-888-407-4747 (US State Dept)',
    email: 'acsnd@state.gov',
    address: 'Shantipath, Chanakyapuri, New Delhi'
  },
  american: {
    country: 'United States of America',
    embassyName: 'Embassy of the United States',
    phone: '+91-11-2419-8000',
    emergencyHelpline: '+1-888-407-4747',
    email: 'acsnd@state.gov',
    address: 'Shantipath, Chanakyapuri, New Delhi'
  },
  uk: {
    country: 'United Kingdom',
    embassyName: 'British High Commission',
    phone: '+91-11-2419-2100',
    emergencyHelpline: '+44-20-7008-5000',
    email: 'consular.newdelhi@fcdo.gov.uk',
    address: 'Shantipath, Chanakyapuri, New Delhi'
  },
  british: {
    country: 'United Kingdom',
    embassyName: 'British High Commission',
    phone: '+91-11-2419-2100',
    emergencyHelpline: '+44-20-7008-5000',
    email: 'consular.newdelhi@fcdo.gov.uk',
    address: 'Shantipath, Chanakyapuri, New Delhi'
  },
  australia: {
    country: 'Australia',
    embassyName: 'Australian High Commission',
    phone: '+91-11-4139-9900',
    emergencyHelpline: '+61-2-6261-3305 (Consular Emergency Centre Canberra)',
    email: 'ahc.newdelhi@dfat.gov.au',
    address: '1/50G Shantipath, Chanakyapuri, New Delhi'
  },
  australian: {
    country: 'Australia',
    embassyName: 'Australian High Commission',
    phone: '+91-11-4139-9900',
    emergencyHelpline: '+61-2-6261-3305',
    email: 'ahc.newdelhi@dfat.gov.au',
    address: '1/50G Shantipath, Chanakyapuri, New Delhi'
  },
  spain: {
    country: 'Spain',
    embassyName: 'Embassy of Spain',
    phone: '+91-11-4129-3000',
    emergencyHelpline: '+91-9810164161 (Emergency Duty Officer)',
    email: 'emb.nuevadelhi@maec.es',
    address: '12 Prithviraj Road, New Delhi'
  },
  spanish: {
    country: 'Spain',
    embassyName: 'Embassy of Spain',
    phone: '+91-11-4129-3000',
    emergencyHelpline: '+91-9810164161',
    email: 'emb.nuevadelhi@maec.es',
    address: '12 Prithviraj Road, New Delhi'
  },
  germany: {
    country: 'Germany',
    embassyName: 'German Embassy',
    phone: '+91-11-4419-9199',
    emergencyHelpline: '+91-9810004802',
    email: 'info@new-delhi.diplo.de',
    address: '6/50G Shantipath, Chanakyapuri, New Delhi'
  },
  france: {
    country: 'France',
    embassyName: 'French Embassy',
    phone: '+91-11-4319-6100',
    emergencyHelpline: '+91-11-4319-6100',
    email: 'admin-francais.new-delhi-amba@diplomatie.gouv.fr',
    address: '2/50E Shantipath, Chanakyapuri, New Delhi'
  }
};

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    let [profile, tourist, user] = await Promise.all([
      TouristProfile.findOne({ userId }),
      Tourist.findById(userId),
      User.findById(userId).select('-passwordHash')
    ]);

    if (!profile) {
      profile = await TouristProfile.create({
        userId,
        emergencyContacts: [],
        medicalInfo: { allergies: [], conditions: [], bloodGroup: 'Unknown' },
        itinerary: []
      });
    }

    if (!tourist && user) {
      tourist = await Tourist.create({
        _id: user._id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash || 'N/A',
        nationality: user.nationality || 'International',
        phone: user.phone || ''
      });
    }

    const medicalNotes = tourist?.medicalNotes || profile.medicalInfo || {
      bloodGroup: 'Unknown',
      allergies: [],
      conditions: [],
      notes: ''
    };

    const emergencyContacts = profile.emergencyContacts?.length > 0
      ? profile.emergencyContacts
      : (tourist?.emergencyContact ? [tourist.emergencyContact] : []);

    const mergedData = {
      ...profile.toJSON(),
      name: user?.name || tourist?.name,
      email: user?.email || tourist?.email,
      phone: user?.phone || tourist?.phone,
      nationality: user?.nationality || tourist?.nationality,
      passportNumber: tourist?.passportNumber || profile.passportOrIdNumber,
      tripDates: tourist?.tripDates || profile.tripDates || {},
      itinerary: profile.itinerary || tourist?.itinerary || [],
      accommodation: tourist?.accommodation || profile.accommodation || '',
      emergencyContact: emergencyContacts[0] || null,
      emergencyContacts,
      medicalNotes,
      medicalInfo: profile.medicalInfo || medicalNotes,
      preferredLanguage: tourist?.preferredLanguage || profile.preferredLanguage || 'en',
      digitalIdToken: tourist?.digitalIdToken || null,
      digitalIdExpiry: tourist?.digitalIdExpiry || null
    };

    return res.status(200).json({
      success: true,
      data: mergedData
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      passportNumber,
      passportOrIdNumber,
      tripDates,
      itinerary,
      accommodation,
      emergencyContact,
      emergencyContacts,
      medicalNotes,
      medicalInfo,
      preferredLanguage,
      travelDocumentsMeta
    } = req.body;

    const passport = passportNumber !== undefined ? passportNumber : passportOrIdNumber;

    let contactsArray = undefined;
    if (emergencyContacts !== undefined && Array.isArray(emergencyContacts)) {
      contactsArray = emergencyContacts;
    } else if (emergencyContact !== undefined) {
      contactsArray = typeof emergencyContact === 'object'
        ? [emergencyContact]
        : [{ name: String(emergencyContact), phone: req.user.phone || '', relation: 'Emergency Contact' }];
    }

    const normalizedMedical = medicalNotes !== undefined ? medicalNotes : medicalInfo;

    // Update TouristProfile
    const profileUpdate = {};
    if (passport !== undefined) profileUpdate.passportOrIdNumber = passport;
    if (contactsArray !== undefined) profileUpdate.emergencyContacts = contactsArray;
    if (normalizedMedical !== undefined) {
      profileUpdate.medicalInfo = {
        allergies: normalizedMedical.allergies || [],
        conditions: normalizedMedical.conditions || [],
        bloodGroup: normalizedMedical.bloodGroup || 'Unknown'
      };
    }
    if (itinerary !== undefined) profileUpdate.itinerary = itinerary;
    if (tripDates !== undefined) profileUpdate.tripDates = tripDates;
    if (accommodation !== undefined) profileUpdate.accommodation = accommodation;
    if (preferredLanguage !== undefined) profileUpdate.preferredLanguage = preferredLanguage;
    if (travelDocumentsMeta !== undefined) profileUpdate.travelDocumentsMeta = travelDocumentsMeta;

    const profile = await TouristProfile.findOneAndUpdate(
      { userId },
      { $set: profileUpdate },
      { new: true, upsert: true, runValidators: true }
    );

    // Update Tourist model
    const touristUpdate = {};
    if (passport !== undefined) touristUpdate.passportNumber = passport;
    if (contactsArray !== undefined && contactsArray.length > 0) touristUpdate.emergencyContact = contactsArray[0];
    if (normalizedMedical !== undefined) touristUpdate.medicalNotes = normalizedMedical;
    if (itinerary !== undefined) touristUpdate.itinerary = itinerary;
    if (tripDates !== undefined) touristUpdate.tripDates = tripDates;
    if (accommodation !== undefined) touristUpdate.accommodation = accommodation;
    if (preferredLanguage !== undefined) touristUpdate.preferredLanguage = preferredLanguage;

    const tourist = await Tourist.findByIdAndUpdate(
      userId,
      { $set: touristUpdate },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Tourist profile updated successfully',
      data: {
        ...profile.toJSON(),
        passportNumber: tourist?.passportNumber || profile.passportOrIdNumber,
        tripDates: tourist?.tripDates || profile.tripDates,
        accommodation: tourist?.accommodation || profile.accommodation,
        emergencyContact: tourist?.emergencyContact || profile.emergencyContacts?.[0],
        medicalNotes: tourist?.medicalNotes || profile.medicalInfo,
        preferredLanguage: tourist?.preferredLanguage || profile.preferredLanguage
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSafetyInfo = async (req, res, next) => {
  try {
    const destination = (req.query.destination || req.query.city || req.query.region || 'general').toLowerCase();

    // Check CMS/SafetyResource model
    let resource = await SafetyResource.findOne({
      $or: [
        { region: new RegExp(`^${destination}$`, 'i') },
        { region: 'general' },
        { region: 'global' }
      ]
    });

    const destinationGuidelines = [
      {
        category: 'Emergency SOS Protocol',
        title: 'Instant Authority Dispatch',
        description: 'Press the SOS button in this app at any time to transmit your live GPS coordinates, medical profile, and emergency contacts directly to the local police control room.'
      },
      {
        category: 'Digital Tourist ID',
        title: 'Keep QR Code Offline & Ready',
        description: 'Show your QR-signed Digital Tourist ID to tourist police, hotel receptionists, and checkpoints for instant cryptographic identity verification.'
      },
      {
        category: 'Geospatial Geofencing',
        title: 'High-Risk Zones Vigilance',
        description: 'Stay alert when crossing into active risk zones marked in red on the safety map. Avoid isolated alleys after 9:00 PM.'
      },
      {
        category: 'Local Laws & Scams',
        title: 'Authorized Transport & Guides',
        description: 'Only board registered government-metered taxis or app-based transport. Verify guide credentials via their official photo ID.'
      }
    ];

    return res.status(200).json({
      success: true,
      destination,
      guidelines: resource?.guidelines?.length ? resource.guidelines : destinationGuidelines,
      emergencyHotlines: {
        police: '112',
        medicalAmbulance: '108',
        touristHelpline: '1363 (24x7 Multi-lingual toll free)',
        fire: '101',
        disasterManagement: '1070'
      },
      healthAdvisory: {
        recommendedHospitals: 'Apollo Hospital & St. John Emergency Trauma Care',
        waterSafety: 'Drink only sealed bottled mineral water or boiled filtered water.',
        emergencyMedicalCoverage: 'Keep travel insurance policy details handy in your profile.'
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSafetyResources = async (req, res, next) => {
  try {
    const nationality = (req.query.nationality || req.user?.nationality || 'International').toLowerCase().trim();
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng) : null;

    // 1. Emergency Hotlines
    const emergencyNumbers = {
      police: '112',
      nationalEmergency: '112',
      medicalAmbulance: '108',
      fire: '101',
      touristHelpline: '1363',
      womenHelpline: '1091',
      childHelpline: '1098'
    };

    // 2. Embassy Contacts matching tourist nationality
    let embassy = EMBASSY_DIRECTORY[nationality] || null;
    if (!embassy) {
      // Partial match
      for (const [key, details] of Object.entries(EMBASSY_DIRECTORY)) {
        if (nationality.includes(key) || details.country.toLowerCase().includes(nationality)) {
          embassy = details;
          break;
        }
      }
    }

    if (!embassy) {
      embassy = {
        country: req.user?.nationality || 'International',
        embassyName: 'International Tourist Consular Helpdesk',
        phone: '+91-11-2419-8000 / 112',
        emergencyHelpline: '1363 (National Tourist Helpline)',
        address: 'Consular Wing, Diplomatic Enclave, Chanakyapuri, New Delhi'
      };
    }

    // 3. Nearest Facilities (Hospital & Police Station)
    let facilities = DEFAULT_FACILITIES.map((f) => ({ ...f }));
    if (lat != null && lng != null) {
      facilities = facilities.map((f) => {
        const distMeters = haversineDistanceMeters(lat, lng, f.location.lat, f.location.lng);
        return {
          ...f,
          distanceMeters: Math.round(distMeters),
          distanceKm: Number((distMeters / 1000).toFixed(2))
        };
      }).sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    // 4. Local safety guidelines
    const safetyGuidelines = [
      'Carry your Digital Tourist QR code on your mobile device at all times.',
      'Allow background location pings to receive instant push alerts near active hazard zones.',
      'Always use metered or registered ride-hailing services.',
      'Emergency numbers 112 and 1363 are toll-free and operate 24/7 across all networks.'
    ];

    return res.status(200).json({
      success: true,
      emergencyNumbers,
      embassyContact: embassy,
      allMajorEmbassies: Object.values(EMBASSY_DIRECTORY),
      safetyGuidelines,
      nearestFacilities: {
        nearestPoliceStation: facilities.find((f) => f.type === 'police_station') || facilities[0],
        nearestHospital: facilities.find((f) => f.type === 'hospital') || facilities[1],
        allFacilities: facilities
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTouristDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [profile, tourist, digitalId, activeSOS, lastPing] = await Promise.all([
      TouristProfile.findOne({ userId }),
      Tourist.findById(userId),
      DigitalTouristID.findOne({ userId, status: 'active' }).sort({ createdAt: -1 }),
      SOSAlert.findOne({ touristId: userId, status: { $in: ['active', 'acknowledged', 'unit_dispatched'] } }).sort({ createdAt: -1 }),
      LocationPing.findOne({ touristId: userId }).sort({ timestamp: -1 }).populate('activeRiskZones')
    ]);

    return res.status(200).json({
      success: true,
      data: {
        profile,
        tourist,
        digitalIdActive: !!digitalId,
        digitalId: digitalId || null,
        activeSOS: activeSOS || null,
        lastKnownLocation: lastPing ? lastPing.location : null,
        currentRiskZones: lastPing?.activeRiskZones || []
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getSafetyInfo,
  getSafetyResources,
  getTouristDashboard
};
