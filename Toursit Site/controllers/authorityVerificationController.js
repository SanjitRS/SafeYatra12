const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const DigitalTouristID = require('../models/DigitalTouristID');
const TouristProfile = require('../models/TouristProfile');
const User = require('../models/User');
const VerificationLog = require('../models/VerificationLog');
const { AppError } = require('../middleware/errorHandler');

const getDigitalIdSecret = () =>
  process.env.DIGITAL_ID_SECRET || process.env.JWT_SECRET || 'digital_id_signing_secret_tourist_2026_q78';

// Helper: Mask passport showing only the last 4 digits
const maskPassport = (idNum) => {
  if (!idNum) return 'N/A';
  const clean = idNum.toString().trim();
  if (clean.length <= 4) return clean;
  return `***-${clean.slice(-4)}`;
};

// Helper: Determine trip validity (active / expired / revoked / flagged)
const determineTripValidity = (itinerary, digitalId) => {
  const now = new Date();
  if (digitalId) {
    if (digitalId.status === 'revoked') return 'revoked';
    if (digitalId.status === 'flagged') return 'flagged';
    if (digitalId.status === 'expired' || (digitalId.expiresAt && new Date(digitalId.expiresAt) < now)) {
      return 'expired';
    }
  }

  if (Array.isArray(itinerary) && itinerary.length > 0) {
    const endDates = itinerary
      .map((item) => (item.endDate ? new Date(item.endDate) : null))
      .filter(Boolean);
    if (endDates.length > 0) {
      const latestEnd = new Date(Math.max(...endDates.map((d) => d.getTime())));
      // Give a 1-day grace period
      if (now.getTime() > latestEnd.getTime() + 24 * 60 * 60 * 1000) {
        return 'expired';
      }
    }
  }

  return 'active';
};

// Helper: Format verification record for consistent output
const formatTouristVerificationRecord = (user, profile, digitalId) => {
  const tripValidity = determineTripValidity(profile?.itinerary, digitalId);
  const statusFlag = digitalId?.status || (tripValidity === 'active' ? 'valid' : tripValidity);

  return {
    touristId: user._id,
    fullName: user.name,
    photo: profile?.photoUrl || digitalId?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    nationality: user.nationality || 'International',
    email: user.email,
    phone: user.phone || 'N/A',
    passportOrIdNumber: maskPassport(profile?.passportOrIdNumber),
    itineraryDates: profile?.itinerary?.map((i) => ({
      location: i.location,
      startDate: i.startDate,
      endDate: i.endDate,
      notes: i.notes
    })) || [],
    emergencyContact: profile?.emergencyContacts?.[0] || null,
    emergencyContacts: profile?.emergencyContacts || [],
    medicalInfo: {
      bloodGroup: profile?.medicalInfo?.bloodGroup || 'Unknown',
      allergies: profile?.medicalInfo?.allergies || [],
      conditions: profile?.medicalInfo?.conditions || []
    },
    tripValidity,
    verificationStatus: statusFlag === 'active' ? 'valid' : statusFlag,
    isFlagged: digitalId?.status === 'flagged' || (digitalId?.flags && digitalId.flags.length > 0),
    flags: digitalId?.flags || [],
    digitalIdInfo: digitalId
      ? {
          id: digitalId._id,
          status: digitalId.status,
          issuedAt: digitalId.issuedAt,
          expiresAt: digitalId.expiresAt,
          verificationCount: digitalId.verificationCount,
          lastVerifiedAt: digitalId.lastVerifiedAt
        }
      : null
  };
};

/**
 * GET /api/authority/tourists/verify/:touristId
 * Looks up tourist by their Digital Tourist ID or User ID.
 * Returns verified tourist record and writes to audit log.
 */
const verifyTouristById = async (req, res, next) => {
  try {
    const { touristId } = req.params;
    const officerId = req.user._id;

    if (!touristId) {
      return next(new AppError('touristId parameter is required', 400, 'PARAM_REQUIRED'));
    }

    let user = null;
    let digitalId = null;

    // Check if touristId is a valid ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(touristId);

    if (isValidObjectId) {
      // Try resolving via DigitalTouristID._id
      digitalId = await DigitalTouristID.findById(touristId);
      if (digitalId) {
        user = await User.findById(digitalId.userId);
      } else {
        // Try resolving via User._id
        user = await User.findById(touristId);
        if (user) {
          digitalId = await DigitalTouristID.findOne({ userId: user._id }).sort({ createdAt: -1 });
        }
      }
    }

    // Fallback: check if touristId matches qrCodePayload or userId string
    if (!user) {
      digitalId = await DigitalTouristID.findOne({
        $or: [{ qrCodePayload: touristId }, { _id: isValidObjectId ? touristId : null }]
      });
      if (digitalId) {
        user = await User.findById(digitalId.userId);
      }
    }

    if (!user) {
      // Log failed lookup in audit log
      await VerificationLog.create({
        officerId,
        touristId: isValidObjectId ? touristId : null,
        timestamp: new Date(),
        location: { zone: req.user.zone || 'Central Zone' },
        result: 'invalid',
        verificationMethod: 'manual_lookup',
        reason: 'Tourist record not found in registry'
      });

      return next(new AppError('Tourist record not found with the provided ID', 404, 'TOURIST_NOT_FOUND'));
    }

    const profile = await TouristProfile.findOne({ userId: user._id });
    const formattedRecord = formatTouristVerificationRecord(user, profile, digitalId);

    // Audit log this verification
    const logResult = formattedRecord.verificationStatus === 'valid' ? 'verified' : formattedRecord.verificationStatus;
    await VerificationLog.create({
      officerId,
      touristId: user._id,
      digitalTouristId: digitalId?._id || null,
      timestamp: new Date(),
      location: {
        zone: req.user.zone || 'Central Zone',
        address: req.query.location || ''
      },
      result: logResult,
      verificationMethod: 'manual_lookup',
      notes: `Manual lookup performed by Officer ${req.user.name}`
    });

    // Increment count if digital ID found
    if (digitalId) {
      digitalId.verificationCount = (digitalId.verificationCount || 0) + 1;
      digitalId.lastVerifiedAt = new Date();
      await digitalId.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Tourist identity record retrieved successfully',
      data: formattedRecord
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/authority/tourists/verify/scan
 * Accepts a scanned QR payload (signed JWT), verifies cryptographic signature & expiry server-side.
 * Returns full verified tourist record or a clear "invalid/expired/tampered" response.
 * Writes to VerificationLog audit collection.
 */
const scanTouristQR = async (req, res, next) => {
  try {
    const { qrPayload, qrCodePayload, location } = req.body;
    const token = qrPayload || qrCodePayload;
    const officerId = req.user._id;

    if (!token) {
      return next(new AppError('Scanned QR token payload is required', 400, 'PAYLOAD_REQUIRED'));
    }

    let decoded = null;
    let failureReason = null;
    let failureResult = null;

    try {
      decoded = jwt.verify(token, getDigitalIdSecret());
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        failureResult = 'expired';
        failureReason = 'Digital Tourist ID QR token has expired. Tourist must generate a new QR ID.';
      } else if (jwtErr.name === 'JsonWebTokenError' && jwtErr.message.includes('signature')) {
        failureResult = 'tampered';
        failureReason = 'Cryptographic signature verification failed: QR code payload has been tampered with or is forged.';
      } else {
        failureResult = 'invalid';
        failureReason = `Invalid QR code payload: ${jwtErr.message}`;
      }
    }

    // If decoding failed
    if (!decoded || failureResult) {
      // Decode unverified token to extract touristId if possible for audit logging
      let unverifiedPayload = null;
      try {
        unverifiedPayload = jwt.decode(token);
      } catch (e) {
        // ignore
      }

      await VerificationLog.create({
        officerId,
        touristId: unverifiedPayload?.touristId && mongoose.Types.ObjectId.isValid(unverifiedPayload.touristId) ? unverifiedPayload.touristId : null,
        timestamp: new Date(),
        location: {
          lat: location?.lat || null,
          lng: location?.lng || null,
          address: location?.address || '',
          zone: location?.zone || req.user.zone || 'Central Zone'
        },
        result: failureResult || 'invalid',
        verificationMethod: 'qr_scan',
        reason: failureReason,
        notes: `Scan rejected by Officer ${req.user.name}`
      });

      return res.status(400).json({
        success: false,
        verified: false,
        message: failureReason,
        data: {
          result: failureResult || 'invalid',
          reason: failureReason
        },
        error: {
          code: `QR_${(failureResult || 'INVALID').toUpperCase()}`,
          message: failureReason
        }
      });
    }

    // Check payload structure
    if (decoded.type !== 'DIGITAL_TOURIST_ID' || !decoded.touristId) {
      await VerificationLog.create({
        officerId,
        timestamp: new Date(),
        location: {
          lat: location?.lat || null,
          lng: location?.lng || null,
          zone: req.user.zone || 'Central Zone'
        },
        result: 'invalid',
        verificationMethod: 'qr_scan',
        reason: 'Malformed QR token: missing DIGITAL_TOURIST_ID payload type'
      });

      return res.status(400).json({
        success: false,
        verified: false,
        message: 'Scanned payload is not a valid Tourist Safety Platform Digital ID',
        data: {
          result: 'invalid',
          reason: 'Malformed payload structure'
        }
      });
    }

    // Lookup tourist and digital ID in DB
    const [user, profile, digitalId] = await Promise.all([
      User.findById(decoded.touristId),
      TouristProfile.findOne({ userId: decoded.touristId }),
      DigitalTouristID.findOne({ userId: decoded.touristId }).sort({ createdAt: -1 })
    ]);

    if (!user) {
      await VerificationLog.create({
        officerId,
        touristId: decoded.touristId,
        timestamp: new Date(),
        location: { zone: req.user.zone || 'Central Zone' },
        result: 'invalid',
        verificationMethod: 'qr_scan',
        reason: 'Tourist user record not found in system registry'
      });

      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Tourist record not found in registry',
        data: { result: 'invalid' }
      });
    }

    // Check if ID is revoked or flagged
    if (digitalId && digitalId.status === 'revoked') {
      await VerificationLog.create({
        officerId,
        touristId: user._id,
        digitalTouristId: digitalId._id,
        timestamp: new Date(),
        location: { zone: req.user.zone || 'Central Zone' },
        result: 'revoked',
        verificationMethod: 'qr_scan',
        reason: 'Digital Tourist ID has been revoked by authorities'
      });

      return res.status(403).json({
        success: false,
        verified: false,
        message: 'Digital Tourist ID has been revoked by authorities',
        data: { result: 'revoked' }
      });
    }

    // Increment verification counter and update timestamp
    if (digitalId) {
      digitalId.verificationCount = (digitalId.verificationCount || 0) + 1;
      digitalId.lastVerifiedAt = new Date();
      await digitalId.save();
    }

    const formattedRecord = formatTouristVerificationRecord(user, profile, digitalId);
    const verificationResult = digitalId?.status === 'flagged' ? 'flagged' : 'verified';

    // Log successful scan in audit log
    await VerificationLog.create({
      officerId,
      touristId: user._id,
      digitalTouristId: digitalId?._id || null,
      timestamp: new Date(),
      location: {
        lat: location?.lat || null,
        lng: location?.lng || null,
        address: location?.address || '',
        zone: location?.zone || req.user.zone || 'Central Zone'
      },
      result: verificationResult,
      verificationMethod: 'qr_scan',
      notes: `QR scanned and verified by Officer ${req.user.name}`
    });

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Tourist identity successfully verified via signed QR token',
      verificationTimestamp: new Date().toISOString(),
      verifiedBy: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
        zone: req.user.zone || 'Central Zone'
      },
      data: formattedRecord,
      tourist: formattedRecord // Included for compatibility
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/authority/tourists/:touristId/flag
 * Allow an officer to flag a tourist ID record (e.g. suspected fraud, lost ID) with a reason and timestamp.
 */
const flagTourist = async (req, res, next) => {
  try {
    const { touristId } = req.params;
    const { reason, flagType } = req.body;
    const officerId = req.user._id;

    if (!reason) {
      return next(new AppError('A valid reason is required to flag a tourist ID', 400, 'REASON_REQUIRED'));
    }

    let user = null;
    let digitalId = null;

    if (mongoose.Types.ObjectId.isValid(touristId)) {
      user = await User.findById(touristId);
      if (user) {
        digitalId = await DigitalTouristID.findOne({ userId: user._id }).sort({ createdAt: -1 });
      } else {
        digitalId = await DigitalTouristID.findById(touristId);
        if (digitalId) {
          user = await User.findById(digitalId.userId);
        }
      }
    }

    if (!user && !digitalId) {
      return next(new AppError('Tourist ID record not found', 404, 'NOT_FOUND'));
    }

    const flagEntry = {
      flaggedBy: officerId,
      reason: `${flagType ? `[${flagType.toUpperCase()}] ` : ''}${reason}`,
      flaggedAt: new Date()
    };

    if (digitalId) {
      digitalId.status = 'flagged';
      if (!digitalId.flags) digitalId.flags = [];
      digitalId.flags.push(flagEntry);
      await digitalId.save();
    }

    // Write to audit log
    await VerificationLog.create({
      officerId,
      touristId: user?._id || digitalId?.userId,
      digitalTouristId: digitalId?._id || null,
      timestamp: new Date(),
      location: { zone: req.user.zone || 'Central Zone' },
      result: 'flagged',
      verificationMethod: 'flag_action',
      reason: flagEntry.reason,
      notes: `Flagged by Officer ${req.user.name}`
    });

    return res.status(200).json({
      success: true,
      message: 'Tourist ID record has been flagged successfully',
      data: {
        touristId: user?._id || digitalId?.userId,
        digitalId: digitalId?._id,
        status: 'flagged',
        flags: digitalId?.flags || [flagEntry],
        flaggedBy: {
          id: req.user._id,
          name: req.user.name
        },
        flaggedAt: flagEntry.flaggedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/authority/tourists/verify/log
 * Audit log of all verification scans (who verified, when, where, result) for accountability.
 */
const getVerificationAuditLog = async (req, res, next) => {
  try {
    const { result, touristId, officerId, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (result) filter.result = result;
    if (touristId && mongoose.Types.ObjectId.isValid(touristId)) filter.touristId = touristId;
    if (officerId && mongoose.Types.ObjectId.isValid(officerId)) filter.officerId = officerId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [logs, totalCount] = await Promise.all([
      VerificationLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate('officerId', 'name email role zone jurisdiction badgeNumber')
        .populate('touristId', 'name email phone nationality'),
      VerificationLog.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      totalCount,
      count: logs.length,
      page: parseInt(page, 10),
      totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyTouristById,
  scanTouristQR,
  flagTourist,
  getVerificationAuditLog,
  maskPassport,
  determineTripValidity
};
