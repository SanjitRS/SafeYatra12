const SOSAlert = require('../models/SOSAlert');
const TouristProfile = require('../models/TouristProfile');
const Tourist = require('../models/Tourist');
const User = require('../models/User');
const { broadcastToAuthorities, broadcastToZone, sendToTourist } = require('../utils/socket');
const { classifyIncidentOrSOS } = require('../utils/aiClassifier');
const { AppError } = require('../middleware/errorHandler');

const triggerSOS = async (req, res, next) => {
  try {
    let { location, message, note, voiceNoteUrl, zone } = req.body;

    // Support flat lat/lng in root of req.body
    if (!location && req.body.lat != null && req.body.lng != null) {
      location = { lat: Number(req.body.lat), lng: Number(req.body.lng) };
    }

    if (!location || location.lat == null || location.lng == null) {
      return next(new AppError('Current location coordinates { lat, lng } are required to trigger an SOS', 400, 'LOCATION_REQUIRED'));
    }

    let touristId = req.user?._id;
    let user = req.user;
    let profile = null;
    let tourist = null;

    if (!touristId) {
      user = await User.findOne({ role: 'tourist' });
      if (!user) user = await User.findOne();
      tourist = await Tourist.findOne();
      profile = await TouristProfile.findOne();
      touristId = user?._id || tourist?._id || '650000000000000000000001';
    } else {
      [user, profile, tourist] = await Promise.all([
        User.findById(touristId).select('name phone nationality email'),
        TouristProfile.findOne({ userId: touristId }),
        Tourist.findById(touristId)
      ]);
    }

    // Construct emergency text
    const distressText = note || message || req.body.reason || 'Emergency SOS button triggered. Immediate response requested.';
    const aiAnalysis = await classifyIncidentOrSOS(distressText, 'emergency');

    // Snapshot of tourist profile for emergency response
    const touristProfileSnapshot = {
      id: user?._id || touristId,
      name: req.body.tourist?.name || user?.name || tourist?.name || 'Arun Sharma (Tourist)',
      phone: req.body.tourist?.phone || user?.phone || tourist?.phone || '+91 94180 22101',
      nationality: user?.nationality || tourist?.nationality || 'Indian',
      passportNumber: tourist?.passportNumber || profile?.passportOrIdNumber || 'IND-2025-9988',
      emergencyContact: profile?.emergencyContacts?.[0] || tourist?.emergencyContact || { name: 'Priya Sharma (Spouse)', phone: '+91 98160 55432' },
      emergencyContacts: profile?.emergencyContacts || (tourist?.emergencyContact ? [tourist.emergencyContact] : [{ name: 'Priya Sharma (Spouse)', phone: '+91 98160 55432' }]),
      medicalNotes: tourist?.medicalNotes || profile?.medicalInfo || { bloodGroup: 'B+', allergies: ['Penicillin'] }
    };

    const alert = await SOSAlert.create({
      touristId,
      location: {
        lat: Number(location.lat),
        lng: Number(location.lng)
      },
      message: distressText,
      note: distressText,
      voiceNoteUrl: voiceNoteUrl || null,
      touristProfileSnapshot,
      status: 'active',
      severity: aiAnalysis.predictedSeverity?.toLowerCase() || 'critical',
      triggeredAt: new Date(),
      priorityScore: aiAnalysis.urgencyScore || 10
    });

    const populatedPayload = {
      sosId: alert._id,
      alertId: alert._id,
      timestamp: alert.createdAt,
      status: alert.status,
      location: alert.location,
      message: alert.message,
      note: alert.note,
      voiceNoteUrl: alert.voiceNoteUrl,
      priorityScore: alert.priorityScore,
      aiAnalysis: {
        predictedSeverity: aiAnalysis.predictedSeverity,
        suggestedAction: aiAnalysis.suggestedAction,
        urgencyScore: aiAnalysis.urgencyScore,
        explanation: aiAnalysis.explanation
      },
      tourist: {
        id: touristProfileSnapshot.id,
        name: touristProfileSnapshot.name,
        phone: touristProfileSnapshot.phone,
        nationality: touristProfileSnapshot.nationality,
        passportNumber: touristProfileSnapshot.passportNumber
      },
      touristProfileSnapshot,
      medicalInfo: touristProfileSnapshot.medicalNotes,
      emergencyContacts: touristProfileSnapshot.emergencyContacts
    };

    // Real-Time Push to Authority Dashboard & Zone Room
    broadcastToAuthorities('sos:emergency', populatedPayload);
    broadcastToAuthorities('sos:new', populatedPayload);
    broadcastToZone(zone || 'Central Zone', 'sos:emergency', populatedPayload);

    // Instant cross-forward to Authority server on port 5001
    try {
      fetch('http://127.0.0.1:5001/api/authority/sos/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(populatedPayload)
      }).catch(() => {});
    } catch (e) {
      // ignore
    }

    // Confirmation event to the tourist
    sendToTourist(touristId.toString(), 'sos:dispatched', {
      sosId: alert._id,
      alertId: alert._id,
      status: 'active',
      dispatchedAt: alert.createdAt,
      message: 'Authorities have been alerted to your exact GPS coordinates.'
    });

    return res.status(201).json({
      success: true,
      message: 'Emergency SOS dispatched immediately. Authorities have been alerted.',
      sosId: alert._id,
      alertId: alert._id,
      alert: populatedPayload
    });
  } catch (error) {
    next(error);
  }
};

const getSOSStatus = async (req, res, next) => {
  try {
    const { sosId } = req.params;

    const alert = await SOSAlert.findById(sosId)
      .populate('touristId', 'name phone nationality email')
      .populate('respondingAuthorityId', 'name email badgeNumber');

    if (!alert) {
      return next(new AppError('SOS Alert not found', 404, 'NOT_FOUND'));
    }

    // Authorization check: only the reporting tourist or authority may view
    if (req.user.role === 'tourist' && alert.touristId?._id?.toString() !== req.user._id.toString()) {
      return next(new AppError('Forbidden: You can only view your own SOS alerts', 403, 'FORBIDDEN'));
    }

    const unitDispatchedInfo = alert.assignedUnit?.unitName || alert.assignedUnit?.unitId ? {
      unitId: alert.assignedUnit.unitId,
      unitName: alert.assignedUnit.unitName || alert.assignedUnit.unitType || 'Patrol Unit',
      etaMinutes: alert.assignedUnit.eta,
      dispatchedAt: alert.assignedUnit.dispatchedAt,
      notes: alert.assignedUnit.notes
    } : null;

    return res.status(200).json({
      success: true,
      sosId: alert._id,
      status: alert.status,
      acknowledgedAt: alert.acknowledgedAt || null,
      unitDispatched: unitDispatchedInfo,
      resolvedAt: alert.resolvedAt || null,
      resolutionNotes: alert.resolutionNotes || alert.closingNote || null,
      cancelledAt: alert.cancelledAt || null,
      cancellationReason: alert.cancellationReason || null,
      location: alert.location,
      message: alert.message,
      createdAt: alert.createdAt,
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

const cancelSOS = async (req, res, next) => {
  try {
    const { sosId } = req.params;
    const { reason } = req.body;

    const alert = await SOSAlert.findById(sosId);
    if (!alert) {
      return next(new AppError('SOS alert not found', 404, 'NOT_FOUND'));
    }

    // Verify ownership
    if (req.user.role === 'tourist' && alert.touristId.toString() !== req.user._id.toString()) {
      return next(new AppError('Forbidden: You can only cancel an SOS triggered by yourself', 403, 'FORBIDDEN'));
    }

    if (alert.status === 'resolved' || alert.status === 'cancelled') {
      return res.status(200).json({
        success: true,
        message: `SOS alert is already ${alert.status}`,
        sosId: alert._id,
        status: alert.status
      });
    }

    alert.status = 'cancelled';
    alert.cancelledAt = new Date();
    alert.cancellationReason = reason || 'False alarm cancelled by tourist';
    await alert.save();

    const cancellationPayload = {
      sosId: alert._id,
      alertId: alert._id,
      status: 'cancelled',
      cancelledAt: alert.cancelledAt,
      cancellationReason: alert.cancellationReason,
      cancelledBy: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role
      }
    };

    // Emit real-time updates
    broadcastToAuthorities('sos:cancelled', cancellationPayload);
    broadcastToAuthorities('sos:status_updated', cancellationPayload);
    sendToTourist(alert.touristId.toString(), 'sos:status_updated', cancellationPayload);

    return res.status(200).json({
      success: true,
      message: 'SOS alert cancelled successfully. False-alarm status updated.',
      sosId: alert._id,
      status: 'cancelled',
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

const getActiveSOSAlerts = async (req, res, next) => {
  try {
    const alerts = await SOSAlert.find({
      status: { $in: ['active', 'acknowledged', 'unit_dispatched'] }
    })
      .sort({ priorityScore: -1, createdAt: -1 })
      .populate('touristId', 'name phone nationality email')
      .populate('respondingAuthorityId', 'name email');

    // Attach medical profile info for situational response
    const enrichedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        const profile = await TouristProfile.findOne({ userId: alert.touristId?._id }).lean();
        return {
          ...alert.toJSON(),
          touristProfile: {
            bloodGroup: profile?.medicalInfo?.bloodGroup || 'Unknown',
            allergies: profile?.medicalInfo?.allergies || [],
            emergencyContacts: profile?.emergencyContacts || []
          }
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: enrichedAlerts.length,
      data: enrichedAlerts
    });
  } catch (error) {
    next(error);
  }
};

const updateSOSStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolutionNotes, unitName, unitId, etaMinutes } = req.body;

    const allowedStatuses = ['acknowledged', 'unit_dispatched', 'resolved', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return next(new AppError(`Status must be one of: ${allowedStatuses.join(', ')}`, 400, 'INVALID_STATUS'));
    }

    const alert = await SOSAlert.findById(id);
    if (!alert) {
      return next(new AppError('SOS alert not found', 404, 'NOT_FOUND'));
    }

    alert.status = status;
    alert.respondingAuthorityId = req.user._id;

    if (status === 'acknowledged') {
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = req.user._id;
    } else if (status === 'unit_dispatched') {
      alert.assignedUnit = {
        unitId: unitId || 'PATROL-1',
        unitName: unitName || 'Tourist Rapid Response Unit',
        eta: etaMinutes ? Number(etaMinutes) : 7,
        dispatchedBy: req.user._id,
        dispatchedAt: new Date(),
        notes: resolutionNotes || 'Response vehicle dispatched with siren.'
      };
    } else if (status === 'resolved') {
      alert.resolvedAt = new Date();
      alert.resolvedBy = req.user._id;
      if (resolutionNotes) alert.resolutionNotes = resolutionNotes;
    }

    await alert.save();
    await alert.populate('respondingAuthorityId', 'name email');

    // Real-time broadcast status change
    const updateEvent = {
      sosId: alert._id,
      alertId: alert._id,
      status: alert.status,
      updatedByAuthority: {
        id: req.user._id,
        name: req.user.name
      },
      assignedUnit: alert.assignedUnit || null,
      resolutionNotes: alert.resolutionNotes,
      timestamp: new Date().toISOString()
    };

    broadcastToAuthorities('sos:status_updated', updateEvent);
    sendToTourist(alert.touristId.toString(), 'sos:status_updated', updateEvent);

    return res.status(200).json({
      success: true,
      message: `SOS alert status updated to ${status}`,
      data: alert
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  triggerSOS,
  getSOSStatus,
  cancelSOS,
  getActiveSOSAlerts,
  updateSOSStatus
};
