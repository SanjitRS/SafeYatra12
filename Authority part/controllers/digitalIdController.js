const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const DigitalTouristID = require('../models/DigitalTouristID');
const TouristProfile = require('../models/TouristProfile');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

const Tourist = require('../models/Tourist');

const getDigitalIdSecret = () =>
  process.env.DIGITAL_ID_SECRET || process.env.JWT_SECRET || 'digital_id_signing_secret_tourist_2026_q78';

const generateDigitalId = async (req, res, next) => {
  try {
    const touristId = req.user._id;

    // Validity: short-lived 24-72 hours (default 48h), renewable
    let validityHours = 48;
    if (req.body.validityHours) {
      validityHours = Math.max(24, Math.min(72, parseInt(req.body.validityHours, 10)));
    } else if (process.env.DIGITAL_ID_VALIDITY_HOURS) {
      validityHours = parseInt(process.env.DIGITAL_ID_VALIDITY_HOURS, 10);
    }

    const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);

    const [user, profile, tourist] = await Promise.all([
      User.findById(touristId),
      TouristProfile.findOne({ userId: touristId }),
      Tourist.findById(touristId)
    ]);

    if (!user) {
      return next(new AppError('Tourist record not found', 404, 'NOT_FOUND'));
    }

    const tripDates = tourist?.tripDates || profile?.tripDates || {};
    const tripValidity = {
      startDate: tripDates.startDate || new Date().toISOString(),
      endDate: tripDates.endDate || expiresAt.toISOString(),
      validUntil: expiresAt.toISOString()
    };

    // Embed safety-relevant, non-sensitive identity metadata inside the cryptographically signed JWT
    const payload = {
      type: 'DIGITAL_TOURIST_ID',
      touristId: user._id.toString(),
      name: user.name,
      nationality: user.nationality,
      passportNumber: tourist?.passportNumber || profile?.passportOrIdNumber || 'VERIFIED',
      tripValidity,
      bloodGroup: tourist?.medicalNotes?.bloodGroup || profile?.medicalInfo?.bloodGroup || 'Unknown',
      allergies: tourist?.medicalNotes?.allergies || profile?.medicalInfo?.allergies || [],
      emergencyContacts: profile?.emergencyContacts || (tourist?.emergencyContact ? [tourist.emergencyContact] : []),
      issuedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    const signedToken = jwt.sign(payload, getDigitalIdSecret(), {
      expiresIn: `${validityHours}h`
    });

    // Generate QR Code as Base64 Data URL
    const qrCodeImage = await QRCode.toDataURL(signedToken, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 400,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    // Deactivate prior active IDs if any
    await DigitalTouristID.updateMany(
      { userId: touristId, status: 'active' },
      { $set: { status: 'expired' } }
    );

    const digitalIdRecord = await DigitalTouristID.create({
      userId: touristId,
      qrCodePayload: signedToken,
      qrCodeImage,
      issuedAt: new Date(),
      expiresAt,
      status: 'active'
    });

    // Synchronize token & expiry on Tourist collection record
    await Tourist.findByIdAndUpdate(touristId, {
      $set: {
        digitalIdToken: signedToken,
        digitalIdExpiry: expiresAt
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Digital Tourist ID generated successfully',
      qrCode: qrCodeImage,
      qrCodeImage,
      token: signedToken,
      digitalId: {
        id: digitalIdRecord._id,
        status: digitalIdRecord.status,
        issuedAt: digitalIdRecord.issuedAt,
        expiresAt: digitalIdRecord.expiresAt,
        validityHours,
        qrCodePayload: signedToken,
        qrCodeImage, // base64 data URL ready for <img> tags
        tripValidity,
        tourist: {
          id: user._id,
          name: user.name,
          nationality: user.nationality,
          passportNumber: payload.passportNumber,
          bloodGroup: payload.bloodGroup,
          allergies: payload.allergies
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const verifyDigitalId = async (req, res, next) => {
  try {
    const rawPayload = req.body.qrCodePayload || req.body.token || req.body.qrCode || req.body.data;

    if (!rawPayload) {
      return next(new AppError('qrCodePayload or token is required for identity verification', 400, 'PAYLOAD_REQUIRED'));
    }

    let decoded = null;
    try {
      decoded = jwt.verify(rawPayload, getDigitalIdSecret());
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(400).json({
          success: false,
          verified: false,
          error: {
            message: 'Digital Tourist ID has expired. Tourist must generate a refreshed ID.',
            code: 'DIGITAL_ID_EXPIRED'
          }
        });
      }
      return res.status(400).json({
        success: false,
        verified: false,
        error: {
          message: 'Invalid digital ID signature. Verification failed.',
          code: 'INVALID_DIGITAL_ID_SIGNATURE'
        }
      });
    }

    if (decoded.type !== 'DIGITAL_TOURIST_ID' || !decoded.touristId) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: {
          message: 'Scanned payload is not a valid Tourist Safety Platform Digital ID',
          code: 'MALFORMED_DIGITAL_ID'
        }
      });
    }

    // Check database status
    const digitalIdDoc = await DigitalTouristID.findOne({
      userId: decoded.touristId,
      status: 'active'
    });

    if (!digitalIdDoc) {
      return res.status(404).json({
        success: false,
        verified: false,
        error: {
          message: 'Digital ID is revoked or not active in the safety registry.',
          code: 'DIGITAL_ID_REVOKED_OR_INACTIVE'
        }
      });
    }

    // Fetch user, profile, and tourist
    const [user, profile, tourist] = await Promise.all([
      User.findById(decoded.touristId).select('name email phone nationality createdAt'),
      TouristProfile.findOne({ userId: decoded.touristId }),
      Tourist.findById(decoded.touristId)
    ]);

    if (!user) {
      return next(new AppError('Registered tourist record not found', 404, 'TOURIST_NOT_FOUND'));
    }

    // Increment verification counter
    digitalIdDoc.verificationCount += 1;
    digitalIdDoc.lastVerifiedAt = new Date();
    await digitalIdDoc.save();

    const authorityInfo = req.user
      ? { id: req.user._id, name: req.user.name }
      : { id: 'AUTHORITY_SYSTEM', name: 'Authorized Patrol Scanner' };

    return res.status(200).json({
      success: true,
      verified: true,
      verificationTimestamp: new Date().toISOString(),
      verifiedByAuthority: authorityInfo,
      digitalId: {
        id: digitalIdDoc._id,
        issuedAt: digitalIdDoc.issuedAt,
        expiresAt: digitalIdDoc.expiresAt,
        verificationCount: digitalIdDoc.verificationCount,
        tripValidity: decoded.tripValidity || null
      },
      // Safety-relevant profile fields ONLY
      tourist: {
        id: user._id,
        name: user.name,
        nationality: user.nationality,
        phone: user.phone,
        passportNumber: tourist?.passportNumber || profile?.passportOrIdNumber || decoded.passportNumber || 'VERIFIED',
        medicalInfo: {
          bloodGroup: tourist?.medicalNotes?.bloodGroup || profile?.medicalInfo?.bloodGroup || decoded.bloodGroup || 'Unknown',
          allergies: tourist?.medicalNotes?.allergies || profile?.medicalInfo?.allergies || decoded.allergies || [],
          conditions: tourist?.medicalNotes?.conditions || profile?.medicalInfo?.conditions || []
        },
        emergencyContacts: profile?.emergencyContacts || (tourist?.emergencyContact ? [tourist.emergencyContact] : []),
        itinerary: tourist?.itinerary || profile?.itinerary || []
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMyDigitalId = async (req, res, next) => {
  try {
    const digitalId = await DigitalTouristID.findOne({
      userId: req.user._id,
      status: 'active'
    }).sort({ createdAt: -1 });

    if (!digitalId) {
      return res.status(404).json({
        success: false,
        message: 'No active Digital Tourist ID found. Please generate one.'
      });
    }

    return res.status(200).json({
      success: true,
      digitalId
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateDigitalId,
  verifyDigitalId,
  getMyDigitalId
};
