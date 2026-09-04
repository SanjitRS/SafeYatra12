const SOSAlert = require('../models/SOSAlert');
const Incident = require('../models/Incident');
const RiskZone = require('../models/RiskZone');
const LocationPing = require('../models/LocationPing');
const TouristProfile = require('../models/TouristProfile');
const User = require('../models/User');
const { isPointInRiskZone } = require('../utils/geoUtils');
const { AppError } = require('../middleware/errorHandler');

const getDashboardSummary = async (req, res, next) => {
  try {
    const [
      activeSosCount,
      acknowledgedSosCount,
      openIncidentsCount,
      investigatingIncidentsCount,
      activeRiskZonesCount,
      recentSosAlerts,
      recentIncidents
    ] = await Promise.all([
      SOSAlert.countDocuments({ status: 'active' }),
      SOSAlert.countDocuments({ status: 'acknowledged' }),
      Incident.countDocuments({ status: 'open' }),
      Incident.countDocuments({ status: 'investigating' }),
      RiskZone.countDocuments({ active: true }),
      SOSAlert.find({ status: { $in: ['active', 'acknowledged'] } })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('touristId', 'name phone nationality'),
      Incident.find({ status: { $in: ['open', 'investigating'] } })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('reportedBy', 'name nationality')
    ]);

    // Count tourists active in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeTourists = await LocationPing.distinct('touristId', {
      timestamp: { $gte: oneDayAgo }
    });

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        activeSOSAlerts: activeSosCount,
        acknowledgedSOSAlerts: acknowledgedSosCount,
        totalUnresolvedSOS: activeSosCount + acknowledgedSosCount,
        openIncidents: openIncidentsCount,
        investigatingIncidents: investigatingIncidentsCount,
        totalActiveIncidents: openIncidentsCount + investigatingIncidentsCount,
        activeRiskZones: activeRiskZonesCount,
        activeTourists24h: activeTourists.length,
        systemThreatLevel:
          activeSosCount > 2
            ? 'HIGH_THREAT'
            : activeSosCount > 0
            ? 'ELEVATED'
            : 'NORMAL'
      },
      recentEmergencies: recentSosAlerts,
      recentIncidents
    });
  } catch (error) {
    next(error);
  }
};

const getTouristsInZone = async (req, res, next) => {
  try {
    const { zoneId } = req.query;

    if (!zoneId) {
      return next(new AppError('zoneId query parameter is required', 400, 'ZONE_ID_REQUIRED'));
    }

    const zone = await RiskZone.findById(zoneId);
    if (!zone) {
      return next(new AppError('Risk zone not found', 404, 'NOT_FOUND'));
    }

    // Get all distinct tourists who sent a ping in the past 24 hours
    const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentPings = await LocationPing.find({
      timestamp: { $gte: recentCutoff }
    })
      .sort({ timestamp: -1 })
      .populate('touristId', 'name email phone nationality');

    // Get latest ping for each tourist
    const touristLatestPing = new Map();
    for (const ping of recentPings) {
      if (!ping.touristId) continue;
      const tId = ping.touristId._id.toString();
      if (!touristLatestPing.has(tId)) {
        touristLatestPing.set(tId, ping);
      }
    }

    // Check which tourists are inside the target zone
    const touristsInZone = [];

    for (const [touristId, ping] of touristLatestPing.entries()) {
      let isInside = false;

      // Check if ping already indexed this zone ID
      if (ping.activeRiskZones && ping.activeRiskZones.some((zId) => zId.toString() === zoneId)) {
        isInside = true;
      } else {
        // Fallback: evaluate geometric containment
        isInside = isPointInRiskZone(ping.location, zone);
      }

      if (isInside) {
        // Fetch medical & emergency contacts for situational awareness
        const profile = await TouristProfile.findOne({ userId: ping.touristId._id }).lean();

        touristsInZone.push({
          tourist: {
            id: ping.touristId._id,
            name: ping.touristId.name,
            phone: ping.touristId.phone,
            nationality: ping.touristId.nationality,
            email: ping.touristId.email
          },
          lastPingLocation: ping.location,
          lastPingTimestamp: ping.timestamp,
          medicalInfo: profile?.medicalInfo || { bloodGroup: 'Unknown', allergies: [] },
          emergencyContacts: profile?.emergencyContacts || []
        });
      }
    }

    return res.status(200).json({
      success: true,
      zone: {
        id: zone._id,
        name: zone.name,
        riskLevel: zone.riskLevel,
        category: zone.category,
        description: zone.description
      },
      touristsCount: touristsInZone.length,
      tourists: touristsInZone
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/authority/tourists/live-locations
 * Fetches the real-time live location of all tourists who have pinged their GPS telemetry,
 * correlating each tourist with their active risk zones, active SOS status, speed, battery, and medical profile.
 */
const getLiveTouristLocations = async (req, res, next) => {
  try {
    const { inRiskZoneOnly, search } = req.query;

    // Get location pings from past 24 hours (or all recent pings)
    const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentPings = await LocationPing.find({
      timestamp: { $gte: recentCutoff }
    })
      .sort({ timestamp: -1 })
      .populate('touristId', 'name email phone nationality role')
      .populate('activeRiskZones', 'name riskLevel category description');

    // Deduplicate to latest ping per tourist
    const latestPingsByTourist = new Map();
    for (const ping of recentPings) {
      if (!ping.touristId?._id) continue;
      const tId = ping.touristId._id.toString();
      if (!latestPingsByTourist.has(tId)) {
        latestPingsByTourist.set(tId, ping);
      }
    }

    // Fallback if no pings in last 24h: fetch absolute latest pings for all tourists
    if (latestPingsByTourist.size === 0) {
      const allPings = await LocationPing.find({})
        .sort({ timestamp: -1 })
        .populate('touristId', 'name email phone nationality role')
        .populate('activeRiskZones', 'name riskLevel category description');

      for (const ping of allPings) {
        if (!ping.touristId?._id) continue;
        const tId = ping.touristId._id.toString();
        if (!latestPingsByTourist.has(tId)) {
          latestPingsByTourist.set(tId, ping);
        }
      }
    }

    // Also get active SOS alerts to flag tourists in distress
    const activeSosList = await SOSAlert.find({
      status: { $in: ['new', 'active', 'acknowledged', 'unit_dispatched', 'escalated'] }
    }).select('touristId status severity triggeredAt');

    const sosMap = new Map();
    activeSosList.forEach((sos) => {
      if (sos.touristId) sosMap.set(sos.touristId.toString(), sos);
    });

    const liveTourists = [];

    for (const [touristId, ping] of latestPingsByTourist.entries()) {
      const touristUser = ping.touristId;
      const activeSos = sosMap.get(touristId);
      const isInsideRiskZone = (ping.activeRiskZones && ping.activeRiskZones.length > 0) || false;

      if (inRiskZoneOnly === 'true' && !isInsideRiskZone) {
        continue;
      }

      if (search) {
        const query = search.toLowerCase();
        const matches =
          touristUser.name?.toLowerCase().includes(query) ||
          touristUser.nationality?.toLowerCase().includes(query) ||
          touristUser.email?.toLowerCase().includes(query);
        if (!matches) continue;
      }

      const profile = await TouristProfile.findOne({ userId: touristUser._id }).lean();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(ping.timestamp).getTime()) / 1000));

      liveTourists.push({
        touristId: touristUser._id,
        name: touristUser.name,
        email: touristUser.email,
        phone: touristUser.phone || 'N/A',
        nationality: touristUser.nationality || 'International',
        currentLocation: {
          lat: ping.location?.lat ?? ping.lat,
          lng: ping.location?.lng ?? ping.lng,
          altitude: ping.altitude || 2050,
          accuracy: ping.accuracy || 5,
          address: ping.address || (isInsideRiskZone ? 'High-Risk Perimeter' : 'Safe Corridor')
        },
        speed: ping.speed || 0,
        batteryLevel: ping.batteryLevel != null ? ping.batteryLevel : 88,
        lastPingAt: ping.timestamp,
        elapsedSeconds,
        inRiskZone: isInsideRiskZone,
        activeRiskZones: ping.activeRiskZones || [],
        hasActiveSOS: !!activeSos,
        activeSosDetails: activeSos
          ? {
              sosId: activeSos._id,
              status: activeSos.status,
              severity: activeSos.severity,
              triggeredAt: activeSos.triggeredAt
            }
          : null,
        emergencyContacts: profile?.emergencyContacts || [],
        medicalInfo: {
          bloodGroup: profile?.medicalInfo?.bloodGroup || 'Unknown',
          allergies: profile?.medicalInfo?.allergies || [],
          conditions: profile?.medicalInfo?.conditions || []
        }
      });
    }

    // Sort: Tourists with Active SOS first, then in danger zone, then by recency
    liveTourists.sort((a, b) => {
      if (a.hasActiveSOS !== b.hasActiveSOS) return a.hasActiveSOS ? -1 : 1;
      if (a.inRiskZone !== b.inRiskZone) return a.inRiskZone ? -1 : 1;
      return new Date(b.lastPingAt).getTime() - new Date(a.lastPingAt).getTime();
    });

    return res.status(200).json({
      success: true,
      count: liveTourists.length,
      touristsInRiskZonesCount: liveTourists.filter((t) => t.inRiskZone).length,
      activeSosCount: liveTourists.filter((t) => t.hasActiveSOS).length,
      timestamp: new Date().toISOString(),
      data: liveTourists
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
  getTouristsInZone,
  getLiveTouristLocations
};

