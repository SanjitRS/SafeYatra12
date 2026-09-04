const Incident = require('../models/Incident');
const LocationPing = require('../models/LocationPing');
const { classifyIncidentOrSOS } = require('../utils/aiClassifier');
const { assessTouristRisk } = require('../utils/aiRiskEngine');
const { broadcastToAuthorities, sendToTourist } = require('../utils/socket');
const { AppError } = require('../middleware/errorHandler');

const createIncident = async (req, res, next) => {
  try {
    let { type, description, location, severity, timestamp, photoUrl } = req.body;

    // Support flat lat/lng in body
    if (!location && req.body.lat != null && req.body.lng != null) {
      location = { lat: Number(req.body.lat), lng: Number(req.body.lng) };
    }

    // Support JSON stringified location if sent via multipart form-data
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        return next(new AppError('Invalid JSON format for location in form-data', 400, 'INVALID_LOCATION'));
      }
    }

    if (!type || !description || !location || location.lat == null || location.lng == null) {
      return next(
        new AppError('Type, description, and location { lat, lng } are required fields', 400, 'FIELDS_REQUIRED')
      );
    }

    // Process uploaded media files via Multer or photoUrl
    const mediaUrls = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        mediaUrls.push(`/uploads/${file.filename}`);
      });
    } else if (photoUrl) {
      mediaUrls.push(photoUrl);
    } else if (req.body.mediaUrls) {
      if (Array.isArray(req.body.mediaUrls)) {
        mediaUrls.push(...req.body.mediaUrls);
      } else if (typeof req.body.mediaUrls === 'string') {
        mediaUrls.push(req.body.mediaUrls);
      }
    }

    // Run AI analysis on the report text and category
    const aiAnalysis = await classifyIncidentOrSOS(description, type);

    // If user didn't specify severity, adopt the AI predicted severity
    const finalSeverity = severity && ['low', 'medium', 'high', 'critical'].includes(severity.toLowerCase())
      ? severity.toLowerCase()
      : aiAnalysis.predictedSeverity;

    const incident = await Incident.create({
      touristId: req.user._id,
      reportedBy: req.user._id,
      type: type.toLowerCase(),
      description,
      location: {
        lat: Number(location.lat),
        lng: Number(location.lng),
        address: location.address || ''
      },
      photoUrl: mediaUrls[0] || photoUrl || '',
      mediaUrls,
      severity: finalSeverity,
      status: 'open',
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      aiAnalysis: {
        predictedSeverity: aiAnalysis.predictedSeverity,
        urgencyScore: aiAnalysis.urgencyScore,
        detectedKeywords: aiAnalysis.detectedKeywords,
        suggestedAction: aiAnalysis.suggestedAction,
        confidence: aiAnalysis.confidence,
        explanation: aiAnalysis.explanation,
        analyzedAt: new Date()
      }
    });

    const populatedIncident = await Incident.findById(incident._id)
      .populate('reportedBy', 'name email phone nationality')
      .populate('touristId', 'name email phone nationality');

    // Real-time broadcast to authorities
    broadcastToAuthorities('incident:new', populatedIncident);

    return res.status(201).json({
      success: true,
      message: 'Incident reported successfully and queued for response',
      incidentId: incident._id,
      data: populatedIncident
    });
  } catch (error) {
    next(error);
  }
};

const getIncidents = async (req, res, next) => {
  try {
    const { status, type, severity, minLat, maxLat, minLng, maxLng } = req.query;

    const query = {};

    // Role-based visibility
    if (req.user.role === 'tourist') {
      // Tourists can only see their own filed reports
      query.$or = [{ reportedBy: req.user._id }, { touristId: req.user._id }];
    }

    if (status) query.status = status;
    if (type) query.type = type;
    if (severity) query.severity = severity;

    // Bounding Box spatial filtering
    if (minLat && maxLat && minLng && maxLng) {
      query.geoPoint = {
        $geoWithin: {
          $box: [
            [parseFloat(minLng), parseFloat(minLat)],
            [parseFloat(maxLng), parseFloat(maxLat)]
          ]
        }
      };
    }

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .populate('reportedBy', 'name phone nationality email')
      .populate('touristId', 'name phone nationality email')
      .populate('assignedOfficer', 'name email');

    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
      incidents
    });
  } catch (error) {
    next(error);
  }
};

const getMyIncidents = async (req, res, next) => {
  try {
    const incidents = await Incident.find({
      $or: [{ reportedBy: req.user._id }, { touristId: req.user._id }]
    })
      .sort({ createdAt: -1 })
      .populate('assignedOfficer', 'name email badgeNumber');

    return res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents,
      incidents
    });
  } catch (error) {
    next(error);
  }
};

const getIncidentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findById(id)
      .populate('reportedBy', 'name phone nationality email')
      .populate('touristId', 'name phone nationality email')
      .populate('assignedOfficer', 'name email');

    if (!incident) {
      return next(new AppError('Incident not found', 404, 'NOT_FOUND'));
    }

    // Role check: tourist can only view their own
    const ownerId = (incident.reportedBy?._id || incident.touristId?._id || incident.reportedBy || incident.touristId)?.toString();
    if (req.user.role === 'tourist' && ownerId !== req.user._id.toString()) {
      return next(new AppError('Forbidden: You can only view incidents reported by yourself', 403, 'FORBIDDEN'));
    }

    return res.status(200).json({
      success: true,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

const updateIncidentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, resolutionSummary, assignedOfficerId } = req.body;

    if (status && !['open', 'investigating', 'resolved'].includes(status)) {
      return next(new AppError('Status must be open, investigating, or resolved', 400, 'INVALID_STATUS'));
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return next(new AppError('Incident not found', 404, 'NOT_FOUND'));
    }

    if (status) incident.status = status;
    if (resolutionSummary) incident.resolutionSummary = resolutionSummary;
    if (assignedOfficerId) incident.assignedOfficer = assignedOfficerId;

    await incident.save();
    await incident.populate('assignedOfficer', 'name email');

    broadcastToAuthorities('incident:status_updated', {
      incidentId: incident._id,
      status: incident.status,
      updatedBy: req.user.name,
      resolutionSummary: incident.resolutionSummary
    });

    const notifyRecipient = incident.reportedBy || incident.touristId;
    if (notifyRecipient) {
      sendToTourist(notifyRecipient.toString(), 'incident:status_updated', {
        incidentId: incident._id,
        status: incident.status,
        resolutionSummary: incident.resolutionSummary
      });
    }

    return res.status(200).json({
      success: true,
      message: `Incident status updated to ${incident.status}`,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Feature 7: AI Smart Feature - Assess Risk for Location + Time of Day
 * POST /api/tourist/ai/assess-risk
 */
const assessRiskEndpoint = async (req, res, next) => {
  try {
    let lat = req.body.lat ?? req.body.location?.lat;
    let lng = req.body.lng ?? req.body.location?.lng;
    const timeOfDay = req.body.timeOfDay;

    // Fallback to tourist's latest location ping
    if (lat == null || lng == null) {
      const latestPing = await LocationPing.findOne({ touristId: req.user._id }).sort({ timestamp: -1 });
      if (latestPing) {
        lat = latestPing.location.lat;
        lng = latestPing.location.lng;
      }
    }

    if (lat == null || lng == null) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates (lat, lng) or a prior location ping are required to assess risk'
      });
    }

    const assessment = await assessTouristRisk({
      lat: Number(lat),
      lng: Number(lng),
      timeOfDay,
      radiusMeters: 1500
    });

    return res.status(200).json(assessment);
  } catch (error) {
    next(error);
  }
};

/**
 * Feature 7 Stretch: AI Incident Triage
 * POST /api/tourist/ai/incident-triage
 */
const incidentTriageEndpoint = async (req, res, next) => {
  try {
    const text = req.body.text || req.body.description || req.body.message;
    const reportedType = req.body.type || 'other';

    if (!text) {
      return next(new AppError('Free-text incident description (text or description) is required for AI triage', 400, 'TEXT_REQUIRED'));
    }

    const analysis = await classifyIncidentOrSOS(text, reportedType);

    return res.status(200).json({
      success: true,
      triage: {
        type: reportedType !== 'other' ? reportedType : analysis.predictedSeverity === 'critical' ? 'assault' : 'theft',
        predictedSeverity: analysis.predictedSeverity,
        severity: analysis.predictedSeverity,
        urgencyScore: analysis.urgencyScore,
        confidence: analysis.confidence,
        detectedKeywords: analysis.detectedKeywords,
        suggestedAction: analysis.suggestedAction,
        explanation: analysis.explanation,
        promptTrace: analysis.promptUsed
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIncident,
  getIncidents,
  getMyIncidents,
  getIncidentById,
  updateIncidentStatus,
  assessRiskEndpoint,
  incidentTriageEndpoint
};
