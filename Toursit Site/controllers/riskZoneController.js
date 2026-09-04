const RiskZone = require('../models/RiskZone');
const Incident = require('../models/Incident');
const { computePredictedRiskZones } = require('../utils/aiRiskEngine');
const { broadcastAll } = require('../utils/socket');
const { AppError } = require('../middleware/errorHandler');

/**
 * Helper to construct a GeoJSON Polygon from center lat/lng and radius in meters
 */
const generateCirclePolygon = (centerLat, centerLng, radiusMeters) => {
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

  return {
    type: 'Polygon',
    coordinates: [coordinates]
  };
};

const getRiskZones = async (req, res, next) => {
  try {
    const {
      category,
      riskLevel,
      active,
      minLat,
      minLng,
      maxLat,
      maxLng,
      nearLat,
      nearLng,
      maxDistance
    } = req.query;

    const query = {};

    if (active !== undefined) {
      query.active = active === 'true';
    } else {
      query.active = true; // Default to active zones
    }

    if (category) query.category = category;
    if (riskLevel) query.riskLevel = riskLevel;

    // Bounding Box Filter ($geoWithin with $box)
    if (minLat && minLng && maxLat && maxLng) {
      query.location = {
        $geoWithin: {
          $box: [
            [parseFloat(minLng), parseFloat(minLat)], // bottom-left [lng, lat]
            [parseFloat(maxLng), parseFloat(maxLat)]  // top-right [lng, lat]
          ]
        }
      };
    }

    // Near point filter ($nearSphere)
    if (nearLat && nearLng) {
      query.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(nearLng), parseFloat(nearLat)]
          },
          $maxDistance: parseFloat(maxDistance || 5000) // Default 5km
        }
      };
    }

    const zones = await RiskZone.find(query).populate('createdBy', 'name role');

    return res.status(200).json({
      success: true,
      count: zones.length,
      data: zones
    });
  } catch (error) {
    next(error);
  }
};

const createRiskZone = async (req, res, next) => {
  try {
    const {
      name,
      description,
      riskLevel,
      category,
      geoPolygon,
      center,
      radiusMeters
    } = req.body;

    if (!name) {
      return next(new AppError('Zone name is required', 400, 'NAME_REQUIRED'));
    }

    let location = null;

    if (geoPolygon && geoPolygon.coordinates) {
      location = {
        type: 'Polygon',
        coordinates: geoPolygon.coordinates
      };
    } else if (center && center.lat != null && center.lng != null) {
      const radius = radiusMeters || 500;
      location = generateCirclePolygon(center.lat, center.lng, radius);
    } else {
      return next(
        new AppError('Either geoPolygon coordinates or center (lat, lng) with radiusMeters is required', 400, 'GEOMETRY_REQUIRED')
      );
    }

    const newZone = await RiskZone.create({
      name,
      description,
      riskLevel: riskLevel || 'medium',
      category: category || 'crime',
      location,
      center: center ? { lat: center.lat, lng: center.lng } : null,
      radiusMeters: radiusMeters || 500,
      active: true,
      createdBy: req.user?._id || null
    });

    // Notify connected clients via Socket.IO
    broadcastAll('risk_zone:created', {
      zone: newZone,
      action: 'NEW_RISK_ZONE_REGISTERED'
    });

    return res.status(201).json({
      success: true,
      message: 'Risk zone created successfully',
      data: newZone
    });
  } catch (error) {
    next(error);
  }
};

const updateRiskZone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If center/radius updated, recompute polygon
    if (updates.center && updates.center.lat != null && updates.center.lng != null) {
      const radius = updates.radiusMeters || 500;
      updates.location = generateCirclePolygon(updates.center.lat, updates.center.lng, radius);
    }

    const updatedZone = await RiskZone.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

    if (!updatedZone) {
      return next(new AppError('Risk zone not found', 404, 'NOT_FOUND'));
    }

    broadcastAll('risk_zone:updated', { zone: updatedZone });

    return res.status(200).json({
      success: true,
      message: 'Risk zone updated successfully',
      data: updatedZone
    });
  } catch (error) {
    next(error);
  }
};

const getPredictedRiskZones = async (req, res, next) => {
  try {
    const maxAgeDays = parseInt(req.query.days || '30', 10);
    const predictionResult = await computePredictedRiskZones({ maxAgeDays });

    return res.status(200).json({
      success: true,
      data: predictionResult
    });
  } catch (error) {
    next(error);
  }
};

const reevaluateZones = async (req, res, next) => {
  try {
    const prediction = await computePredictedRiskZones({ maxAgeDays: 30 });
    const zones = await RiskZone.find({ active: true });

    let updatedCount = 0;

    for (const zone of zones) {
      // Find incidents near this zone center
      if (zone.center && zone.center.lat != null) {
        const matchingCluster = prediction.predictedZones.find((c) => {
          const dLat = Math.abs(c.center.lat - zone.center.lat);
          const dLng = Math.abs(c.center.lng - zone.center.lng);
          return dLat < 0.01 && dLng < 0.01;
        });

        if (matchingCluster) {
          zone.incidentCount = matchingCluster.incidentCount;
          zone.aiRiskScore = matchingCluster.riskScore;
          if (matchingCluster.riskScore >= 75) zone.riskLevel = 'critical';
          else if (matchingCluster.riskScore >= 50) zone.riskLevel = 'high';
          else if (matchingCluster.riskScore >= 25) zone.riskLevel = 'medium';
          await zone.save();
          updatedCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Risk zones re-evaluated using spatial AI model',
      updatedZonesCount: updatedCount,
      aiAnalysis: prediction
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRiskZones,
  createRiskZone,
  updateRiskZone,
  getPredictedRiskZones,
  reevaluateZones
};
