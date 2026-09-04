const mongoose = require('mongoose');
const { z } = require('zod');
const SOSAlert = require('../models/SOSAlert');
const ResponseUnit = require('../models/ResponseUnit');
const TouristProfile = require('../models/TouristProfile');
const User = require('../models/User');
const { broadcastToAuthorities, broadcastToZone, sendToTourist } = require('../utils/socket');
const { AppError } = require('../middleware/errorHandler');

// Severity ranking for sorting
const severityRank = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

const dispatchSchema = z.object({
  unitId: z.string().min(1, 'Unit ID is required'),
  unitType: z.string().optional(),
  eta: z.number().min(1, 'ETA in minutes must be at least 1').or(z.string()),
  notes: z.string().optional()
});

const unitSchema = z.object({
  unitId: z.string().min(1, 'Unit ID is required'),
  name: z.string().optional(),
  type: z.enum(['police_patrol', 'medical_trauma', 'tourism_helpline', 'fire_rescue']).default('police_patrol'),
  zone: z.string().min(1, 'Zone is required'),
  status: z.enum(['available', 'dispatched', 'maintenance', 'offline']).default('available'),
  currentLocation: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      address: z.string().optional()
    })
    .optional(),
  contactNumber: z.string().optional(),
  callSign: z.string().optional(),
  vehiclePlate: z.string().optional()
});

/**
 * GET /api/authority/sos/active
 * List all currently open/unresolved SOS alerts, sorted by severity then recency,
 * each with tourist details, live location (lat/lng), timestamp, and current status.
 */
const getActiveSOSAlerts = async (req, res, next) => {
  try {
    const { zone } = req.query;

    const openStatuses = ['new', 'active', 'acknowledged', 'unit_dispatched', 'escalated'];
    const alerts = await SOSAlert.find({
      status: { $in: openStatuses }
    })
      .sort({ createdAt: -1 })
      .populate('touristId', 'name email phone nationality')
      .populate('acknowledgedBy', 'name email role badgeNumber')
      .populate('respondingAuthorityId', 'name email role')
      .populate('assignedUnit.dispatchedBy', 'name email role');

    // Enrich alerts with profiles, overdue flags, and normalized fields
    const enrichedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        const tourist = alert.touristId;
        let profile = null;
        if (tourist?._id) {
          profile = await TouristProfile.findOne({ userId: tourist._id }).lean();
        }

        const triggeredTime = alert.triggeredAt || alert.createdAt;
        const elapsedMinutes = Math.floor((Date.now() - new Date(triggeredTime).getTime()) / (60 * 1000));
        // Overdue if not acknowledged within 2 minutes
        const isOverdue = ['new', 'active'].includes(alert.status) && elapsedMinutes >= 2;

        return {
          id: alert._id,
          _id: alert._id,
          touristId: tourist?._id || alert.touristId,
          status: alert.status,
          severity: alert.severity || 'high',
          priorityScore: alert.priorityScore || 10,
          location: alert.location,
          message: alert.message,
          triggeredAt: triggeredTime,
          createdAt: alert.createdAt,
          elapsedMinutes,
          isOverdue: alert.isEscalated || isOverdue,
          isEscalated: alert.isEscalated || false,
          escalationReason: alert.escalationReason || (isOverdue ? 'Overdue: No acknowledgment within 2 minutes' : null),
          escalatedAt: alert.escalatedAt || null,
          acknowledgedAt: alert.acknowledgedAt || null,
          acknowledgedBy: alert.acknowledgedBy || alert.respondingAuthorityId || null,
          assignedUnit: alert.assignedUnit || null,
          notes: alert.notes || [],
          tourist: {
            id: tourist?._id,
            name: tourist?.name || 'Unknown Tourist',
            email: tourist?.email,
            phone: tourist?.phone || 'N/A',
            nationality: tourist?.nationality || 'International',
            medicalInfo: {
              bloodGroup: profile?.medicalInfo?.bloodGroup || 'Unknown',
              allergies: profile?.medicalInfo?.allergies || [],
              conditions: profile?.medicalInfo?.conditions || []
            },
            emergencyContacts: profile?.emergencyContacts || []
          }
        };
      })
    );

    // Custom multi-tier sort: severity first (critical -> high -> medium -> low), then recency
    enrichedAlerts.sort((a, b) => {
      const rankA = severityRank[a.severity] || 0;
      const rankB = severityRank[b.severity] || 0;
      if (rankB !== rankA) {
        return rankB - rankA;
      }
      return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
    });

    return res.status(200).json({
      success: true,
      count: enrichedAlerts.length,
      data: enrichedAlerts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/authority/sos/:sosId/acknowledge
 * Authority acknowledges receipt of an SOS, timestamps it,
 * notifies the tourist app that help is coming (via Socket.io / push).
 */
const acknowledgeSOS = async (req, res, next) => {
  try {
    const { sosId } = req.params;
    const officerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(sosId)) {
      return next(new AppError('Invalid SOS ID format', 400, 'INVALID_ID'));
    }

    const alert = await SOSAlert.findById(sosId);
    if (!alert) {
      return next(new AppError('SOS alert not found', 404, 'NOT_FOUND'));
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = officerId;
    alert.respondingAuthorityId = officerId; // maintain compatibility with existing fields

    await alert.save();
    await alert.populate('acknowledgedBy', 'name email role badgeNumber');

    // Notify Tourist in real-time
    const touristId = alert.touristId ? alert.touristId.toString() : null;
    const ackPayload = {
      alertId: alert._id,
      status: 'acknowledged',
      acknowledgedAt: alert.acknowledgedAt,
      message: 'Help is on the way. An emergency monitoring officer has acknowledged your SOS.',
      acknowledgedBy: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role,
        zone: req.user.zone || 'Central Zone'
      }
    };

    if (touristId) {
      sendToTourist(touristId, 'sos:acknowledged', ackPayload);
      sendToTourist(touristId, 'sos:status_updated', ackPayload);
    }

    // Broadcast to Authority Zone and global dashboards
    const officerZone = req.user.zone || 'Central Zone';
    broadcastToZone(officerZone, 'sos:acknowledged', ackPayload);

    return res.status(200).json({
      success: true,
      message: 'SOS alert acknowledged successfully. Notification sent to tourist.',
      data: {
        id: alert._id,
        status: alert.status,
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/authority/sos/:sosId/dispatch
 * Assign a response unit (police patrol / medical / tourism helpline) to the SOS.
 * Body: { unitId, unitType, eta, notes }
 * Updates SOS status to "unit_dispatched" and broadcasts the assigned unit + ETA back to the tourist in real time.
 */
const dispatchUnitToSOS = async (req, res, next) => {
  try {
    const { sosId } = req.params;
    const validatedData = dispatchSchema.parse(req.body);
    const etaMinutes = Number(validatedData.eta);
    const officerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(sosId)) {
      return next(new AppError('Invalid SOS ID format', 400, 'INVALID_ID'));
    }

    const alert = await SOSAlert.findById(sosId);
    if (!alert) {
      return next(new AppError('SOS alert not found', 404, 'NOT_FOUND'));
    }

    // Find or update response unit
    let unit = await ResponseUnit.findOne({ unitId: validatedData.unitId.toUpperCase() });
    if (!unit) {
      // Create registered unit if not present
      unit = await ResponseUnit.create({
        unitId: validatedData.unitId.toUpperCase(),
        name: `${validatedData.unitType || 'PATROL'} #${validatedData.unitId}`,
        type: validatedData.unitType || 'police_patrol',
        zone: req.user.zone || 'Central Zone',
        status: 'dispatched',
        activeSosId: alert._id,
        lastDispatchedAt: new Date()
      });
    } else {
      unit.status = 'dispatched';
      unit.activeSosId = alert._id;
      unit.lastDispatchedAt = new Date();
      if (validatedData.unitType) {
        unit.type = validatedData.unitType;
      }
      await unit.save();
    }

    // Update SOS Alert
    alert.status = 'unit_dispatched';
    alert.assignedUnit = {
      unitId: unit.unitId,
      unitRef: unit._id,
      unitType: unit.type,
      eta: etaMinutes,
      dispatchedBy: officerId,
      dispatchedAt: new Date(),
      notes: validatedData.notes || ''
    };

    if (validatedData.notes) {
      alert.notes.push({
        author: officerId,
        authorName: req.user.name,
        note: `Dispatched ${unit.unitId} (${unit.type}) with ETA: ${etaMinutes} mins. Note: ${validatedData.notes}`
      });
    }

    await alert.save();
    await alert.populate('assignedUnit.dispatchedBy', 'name email role');

    // Real-time notification to tourist
    const touristId = alert.touristId ? alert.touristId.toString() : null;
    const dispatchPayload = {
      alertId: alert._id,
      status: 'unit_dispatched',
      message: `Unit ${unit.unitId} (${unit.type.replace('_', ' ')}) has been dispatched. Estimated arrival: ${etaMinutes} minutes.`,
      assignedUnit: {
        unitId: unit.unitId,
        unitType: unit.type,
        eta: etaMinutes,
        dispatchedAt: alert.assignedUnit.dispatchedAt,
        notes: validatedData.notes || ''
      },
      dispatchedBy: {
        id: req.user._id,
        name: req.user.name
      }
    };

    if (touristId) {
      sendToTourist(touristId, 'sos:unit_dispatched', dispatchPayload);
      sendToTourist(touristId, 'sos:status_updated', dispatchPayload);
    }

    // Broadcast to authority zone room
    const zone = unit.zone || req.user.zone || 'Central Zone';
    broadcastToZone(zone, 'sos:unit_dispatched', dispatchPayload);

    return res.status(200).json({
      success: true,
      message: `Unit ${unit.unitId} successfully dispatched to SOS alert`,
      data: {
        alertId: alert._id,
        status: alert.status,
        assignedUnit: alert.assignedUnit,
        unit: {
          id: unit._id,
          unitId: unit.unitId,
          type: unit.type,
          status: unit.status,
          zone: unit.zone
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/authority/units
 * List available response units with type, current status (available/dispatched), and last known location.
 */
const listUnits = async (req, res, next) => {
  try {
    const { zone, status, type } = req.query;

    const filter = {};
    if (zone) filter.zone = new RegExp(zone, 'i');
    if (status) filter.status = status;
    if (type) filter.type = type;

    const units = await ResponseUnit.find(filter).sort({ status: 1, unitId: 1 });

    return res.status(200).json({
      success: true,
      count: units.length,
      data: units
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/authority/units
 * Register/update a response unit (id, type, zone, status, currentLocation).
 */
const registerOrUpdateUnit = async (req, res, next) => {
  try {
    const body = { ...req.body };
    // Handle both id or unitId in body
    if (!body.unitId && body.id) {
      body.unitId = body.id;
    }

    const validatedData = unitSchema.parse(body);

    const unit = await ResponseUnit.findOneAndUpdate(
      { unitId: validatedData.unitId.toUpperCase() },
      {
        $set: {
          unitId: validatedData.unitId.toUpperCase(),
          name: validatedData.name || `${validatedData.type.replace('_', ' ').toUpperCase()} #${validatedData.unitId.toUpperCase()}`,
          type: validatedData.type,
          zone: validatedData.zone,
          status: validatedData.status,
          currentLocation: validatedData.currentLocation || { lat: 0, lng: 0, address: '' },
          contactNumber: validatedData.contactNumber,
          callSign: validatedData.callSign,
          vehiclePlate: validatedData.vehiclePlate
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Real-time update to authority dashboard
    broadcastToZone(unit.zone, 'unit:status_updated', {
      unitId: unit.unitId,
      status: unit.status,
      zone: unit.zone,
      type: unit.type
    });

    return res.status(201).json({
      success: true,
      message: 'Response unit registered/updated successfully',
      data: unit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/authority/sos/:sosId/resolve
 * Mark an SOS as resolved with a closing note. Releases assigned unit back to available.
 */
const resolveSOS = async (req, res, next) => {
  try {
    const { sosId } = req.params;
    const { closingNote, resolutionNotes } = req.body;
    const officerId = req.user._id;
    const note = closingNote || resolutionNotes || 'SOS emergency resolved by responding unit.';

    if (!mongoose.Types.ObjectId.isValid(sosId)) {
      return next(new AppError('Invalid SOS ID format', 400, 'INVALID_ID'));
    }

    const alert = await SOSAlert.findById(sosId);
    if (!alert) {
      return next(new AppError('SOS alert not found', 404, 'NOT_FOUND'));
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = officerId;
    alert.resolutionNotes = note;
    alert.closingNote = note;

    alert.notes.push({
      author: officerId,
      authorName: req.user.name,
      note: `RESOLVED: ${note}`
    });

    await alert.save();

    // Release assigned unit back to available
    if (alert.assignedUnit?.unitId) {
      await ResponseUnit.findOneAndUpdate(
        { unitId: alert.assignedUnit.unitId },
        {
          $set: {
            status: 'available',
            activeSosId: null
          }
        }
      );
    }

    // Real-time event notifications
    const touristId = alert.touristId ? alert.touristId.toString() : null;
    const resolvePayload = {
      alertId: alert._id,
      status: 'resolved',
      closingNote: note,
      resolvedAt: alert.resolvedAt,
      resolvedBy: {
        id: req.user._id,
        name: req.user.name
      }
    };

    if (touristId) {
      sendToTourist(touristId, 'sos:resolved', resolvePayload);
      sendToTourist(touristId, 'sos:status_updated', resolvePayload);
    }

    broadcastToAuthorities('sos:resolved', resolvePayload);

    return res.status(200).json({
      success: true,
      message: 'SOS alert resolved successfully',
      data: {
        id: alert._id,
        status: alert.status,
        closingNote: note,
        resolvedAt: alert.resolvedAt,
        resolvedBy: {
          id: req.user._id,
          name: req.user.name
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/authority/sos/:sosId/escalate
 * Escalate an unresolved SOS after a time threshold (e.g. no acknowledgment in 2 minutes)
 * Flag it visually as overdue for the dashboard.
 */
const escalateSOS = async (req, res, next) => {
  try {
    const { sosId } = req.params;
    const { reason } = req.body;
    const officerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(sosId)) {
      return next(new AppError('Invalid SOS ID format', 400, 'INVALID_ID'));
    }

    const alert = await SOSAlert.findById(sosId);
    if (!alert) {
      return next(new AppError('SOS alert not found', 404, 'NOT_FOUND'));
    }

    const escalationReason = reason || 'SOS overdue: No acknowledgment or dispatch within required threshold';

    alert.status = 'escalated';
    alert.isEscalated = true;
    alert.escalatedAt = new Date();
    alert.escalationReason = escalationReason;
    alert.severity = 'critical'; // automatically elevate severity on escalation
    alert.priorityScore = 10;

    alert.notes.push({
      author: officerId,
      authorName: req.user.name,
      note: `ESCALATED: ${escalationReason}`
    });

    await alert.save();

    const escalatePayload = {
      alertId: alert._id,
      status: 'escalated',
      isEscalated: true,
      escalationReason,
      escalatedAt: alert.escalatedAt,
      severity: 'critical',
      escalatedBy: {
        id: req.user._id,
        name: req.user.name
      }
    };

    // Broadcast urgent high-threat alarm to dashboard
    broadcastToAuthorities('sos:escalated', escalatePayload);

    return res.status(200).json({
      success: true,
      message: 'SOS alert escalated to critical overdue status',
      data: {
        id: alert._id,
        status: alert.status,
        isEscalated: alert.isEscalated,
        escalationReason: alert.escalationReason,
        escalatedAt: alert.escalatedAt,
        severity: alert.severity
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActiveSOSAlerts,
  acknowledgeSOS,
  dispatchUnitToSOS,
  listUnits,
  registerOrUpdateUnit,
  resolveSOS,
  escalateSOS
};
