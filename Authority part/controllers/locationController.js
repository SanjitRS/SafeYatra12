const { z } = require('zod');
const LocationPing = require('../models/LocationPing');
const RiskZone = require('../models/RiskZone');
const Incident = require('../models/Incident');
const { isPointInRiskZone, haversineDistanceMeters } = require('../utils/geoUtils');
const { sendToTourist, broadcastToAuthorities } = require('../utils/socket');
const { AppError } = require('../middleware/errorHandler');

const pingSchema = z.object({
  lat: z.number().min(-90).max(90, 'Latitude must be between -90 and 90').optional(),
  lng: z.number().min(-180).max(180, 'Longitude must be between -180 and 180').optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  speed: z.number().optional(),
  batteryLevel: z.number().min(0).max(100).optional()
}).refine((data) => (data.lat != null && data.lng != null) || data.location != null, {
  message: 'Coordinates (lat, lng) or location object required'
});

const pingLocation = async (req, res, next) => {
  try {
    const validated = pingSchema.parse(req.body);
    const lat = validated.lat ?? validated.location?.lat;
    const lng = validated.lng ?? validated.location?.lng;
    const speed = validated.speed;
    const batteryLevel = validated.batteryLevel;
    const touristId = req.user._id;

    // 1. Geospatial Query using MongoDB 2dsphere index ($geoIntersects)
    let matchedZones = [];
    try {
      matchedZones = await RiskZone.find({
        active: true,
        'location.type': 'Polygon',
        location: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            }
          }
        }
      });
    } catch (geoErr) {
      // Fallback handles this seamlessly
    }

    // 2. Also check circular risk zones or all active zones using geometric fallback
    const allActiveZones = await RiskZone.find({ active: true });
    const fallbackMatches = allActiveZones.filter((zone) => isPointInRiskZone({ lat, lng }, zone));

    // Combine unique zones
    const zoneMap = new Map();
    matchedZones.forEach((z) => zoneMap.set(z._id.toString(), z));
    fallbackMatches.forEach((z) => zoneMap.set(z._id.toString(), z));
    const activeZones = Array.from(zoneMap.values());

    const activeZoneIds = activeZones.map((z) => z._id);

    // Save Location Ping
    const ping = await LocationPing.create({
      touristId,
      lat,
      lng,
      location: { lat, lng },
      geoPoint: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      activeRiskZones: activeZoneIds,
      speed,
      batteryLevel,
      timestamp: new Date()
    });

    // Prune rolling history to last N points (default 20 points) for privacy & efficiency
    await LocationPing.pruneRollingHistory(touristId, 20);

    // Format warnings
    const warnings = activeZones.map((zone) => ({
      zoneId: zone._id,
      name: zone.name,
      riskLevel: zone.riskLevel,
      category: zone.category,
      description: zone.description,
      cautionMessage: `CAUTION: You have entered '${zone.name}', designated as ${zone.riskLevel.toUpperCase()} risk for ${zone.category}. Please exercise extreme vigilance.`
    }));

    // Real-time WebSocket Push
    if (warnings.length > 0) {
      sendToTourist(touristId.toString(), 'hazard:warning', {
        type: 'RISK_ZONE_BREACH',
        timestamp: new Date().toISOString(),
        location: { lat, lng },
        warnings
      });

      const hasHighRisk = activeZones.some((z) => ['high', 'critical'].includes(z.riskLevel));
      if (hasHighRisk) {
        broadcastToAuthorities('tourist:zone_entry', {
          tourist: {
            id: req.user._id,
            name: req.user.name,
            phone: req.user.phone,
            nationality: req.user.nationality
          },
          location: { lat, lng },
          breachedZones: warnings
        });
      }
    }

    return res.status(200).json({
      success: true,
      inRiskZone: warnings.length > 0,
      warningsCount: warnings.length,
      warnings,
      location: { lat, lng },
      pingId: ping._id,
      timestamp: ping.timestamp
    });
  } catch (error) {
    next(error);
  }
};

const getLocationAlerts = async (req, res, next) => {
  try {
    let lat = req.query.lat ? parseFloat(req.query.lat) : null;
    let lng = req.query.lng ? parseFloat(req.query.lng) : null;
    const radiusMeters = req.query.radius ? parseFloat(req.query.radius) : 1500;

    // Fallback to tourist's latest location ping if coordinates not provided
    if (lat == null || lng == null) {
      const latestPing = await LocationPing.findOne({ touristId: req.user._id }).sort({ timestamp: -1 });
      if (latestPing) {
        lat = latestPing.location.lat;
        lng = latestPing.location.lng;
      }
    }

    if (lat == null || lng == null) {
      return res.status(200).json({
        success: true,
        message: 'No location provided or recorded yet. Send a location update first.',
        alerts: [],
        riskZones: []
      });
    }

    // Find active risk zones near this point
    const allZones = await RiskZone.find({ active: true });
    const nearbyAlerts = [];

    for (const zone of allZones) {
      let isNear = false;
      let distance = 0;

      if (zone.center && zone.center.lat != null && zone.center.lng != null) {
        distance = haversineDistanceMeters(lat, lng, zone.center.lat, zone.center.lng);
        const zoneEffectiveRadius = (zone.radiusMeters || 500) + radiusMeters;
        if (distance <= zoneEffectiveRadius) {
          isNear = true;
        }
      } else {
        // Evaluate geometry containment or boundary proximity
        if (isPointInRiskZone({ lat, lng }, zone)) {
          isNear = true;
          distance = 0;
        }
      }

      if (isNear) {
        nearbyAlerts.push({
          zoneId: zone._id,
          name: zone.name,
          riskLevel: zone.riskLevel,
          category: zone.category,
          description: zone.description,
          distanceMeters: Math.round(distance),
          advisory: `Warning: You are in or within ${Math.round(distance)}m of '${zone.name}' (${zone.riskLevel.toUpperCase()} risk - ${zone.category}).`
        });
      }
    }

    return res.status(200).json({
      success: true,
      location: { lat, lng },
      alertsCount: nearbyAlerts.length,
      alerts: nearbyAlerts,
      riskZones: nearbyAlerts
    });
  } catch (error) {
    next(error);
  }
};

const getNearbyAlerts = async (req, res, next) => {
  try {
    const touristId = req.user._id;
    const latestPing = await LocationPing.findOne({ touristId }).sort({ timestamp: -1 });

    if (!latestPing) {
      return res.status(200).json({
        success: true,
        hasLocation: false,
        message: 'No recent location ping found for tourist. Please ping location.',
        alerts: []
      });
    }

    const { lat, lng } = latestPing.location;
    const allZones = await RiskZone.find({ active: true });
    const activeWarnings = [];

    for (const zone of allZones) {
      let isThreat = false;
      let dist = 0;

      if (zone.center && zone.center.lat != null && zone.center.lng != null) {
        dist = haversineDistanceMeters(lat, lng, zone.center.lat, zone.center.lng);
        if (dist <= (zone.radiusMeters || 500) + 1000) {
          isThreat = true;
        }
      } else if (isPointInRiskZone({ lat, lng }, zone)) {
        isThreat = true;
        dist = 0;
      }

      if (isThreat) {
        activeWarnings.push({
          zoneId: zone._id,
          name: zone.name,
          riskLevel: zone.riskLevel,
          category: zone.category,
          description: zone.description,
          distanceMeters: Math.round(dist),
          alertTitle: `Safety Alert: ${zone.name}`,
          recommendedAction: `Exercise caution. ${zone.description || 'Hazard zone detected.'}`
        });
      }
    }

    // Also check recent high-severity incidents nearby (past 48 hours)
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentIncidents = await Incident.find({
      createdAt: { $gte: twoDaysAgo },
      severity: { $in: ['high', 'critical'] }
    }).limit(10);

    const nearbyIncidents = recentIncidents.filter((inc) => {
      const incLat = inc.location?.lat;
      const incLng = inc.location?.lng;
      if (incLat == null || incLng == null) return false;
      return haversineDistanceMeters(lat, lng, incLat, incLng) <= 2000;
    }).map((inc) => ({
      incidentId: inc._id,
      type: inc.type,
      severity: inc.severity,
      description: inc.description,
      reportedAt: inc.createdAt
    }));

    return res.status(200).json({
      success: true,
      hasLocation: true,
      lastKnownLocation: { lat, lng, recordedAt: latestPing.timestamp },
      alertsCount: activeWarnings.length,
      alerts: activeWarnings,
      nearbyHighSeverityIncidents: nearbyIncidents
    });
  } catch (error) {
    next(error);
  }
};

const getLatestLocation = async (req, res, next) => {
  try {
    const latestPing = await LocationPing.findOne({ touristId: req.user._id })
      .sort({ timestamp: -1 })
      .populate('activeRiskZones');

    return res.status(200).json({
      success: true,
      data: latestPing
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  pingLocation,
  getLocationAlerts,
  getNearbyAlerts,
  getLatestLocation,
  pingSchema
};
