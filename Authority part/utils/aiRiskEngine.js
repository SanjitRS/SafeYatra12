const Incident = require('../models/Incident');
const { haversineDistanceMeters } = require('./geoUtils');

// Half-life for incident time-decay in days (incidents lose 50% impact after 7 days)
const HALF_LIFE_DAYS = 7;
const DECAY_LAMBDA = Math.log(2) / HALF_LIFE_DAYS;

const SEVERITY_WEIGHTS = {
  low: 1.0,
  medium: 2.5,
  high: 5.0,
  critical: 10.0
};

/**
 * Calculates time-decay weight for an incident
 * W(t) = e^(-lambda * dt_days)
 */
function calculateTimeDecayWeight(createdAt) {
  const now = Date.now();
  const incidentTime = new Date(createdAt).getTime();
  const diffDays = Math.max(0, (now - incidentTime) / (1000 * 60 * 60 * 24));
  return Math.exp(-DECAY_LAMBDA * diffDays);
}

/**
 * Clusters points using spatial distance threshold (in meters)
 * @param {Array} incidents 
 * @param {number} distanceThresholdMeters default 650m
 */
function clusterIncidents(incidents, distanceThresholdMeters = 650) {
  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < incidents.length; i++) {
    if (visited.has(i)) continue;

    const currentIncident = incidents[i];
    const currentCluster = [currentIncident];
    visited.add(i);

    const lat1 = currentIncident.location?.lat ?? currentIncident.geoPoint?.coordinates?.[1];
    const lng1 = currentIncident.location?.lng ?? currentIncident.geoPoint?.coordinates?.[0];

    if (lat1 == null || lng1 == null) continue;

    for (let j = i + 1; j < incidents.length; j++) {
      if (visited.has(j)) continue;

      const otherIncident = incidents[j];
      const lat2 = otherIncident.location?.lat ?? otherIncident.geoPoint?.coordinates?.[1];
      const lng2 = otherIncident.location?.lng ?? otherIncident.geoPoint?.coordinates?.[0];

      if (lat2 == null || lng2 == null) continue;

      const dist = haversineDistanceMeters(lat1, lng1, lat2, lng2);
      if (dist <= distanceThresholdMeters) {
        currentCluster.push(otherIncident);
        visited.add(j);
      }
    }

    clusters.push(currentCluster);
  }

  return clusters;
}

/**
 * Runs the AI Risk Scoring and Cluster Prediction Model over all recent incidents
 * Returns predicted risk zones with scores, time decay, dominant hazard types, and response advice.
 */
async function computePredictedRiskZones(options = {}) {
  const maxAgeDays = options.maxAgeDays || 30;
  const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

  const incidents = await Incident.find({
    createdAt: { $gte: cutoffDate }
  }).lean();

  if (incidents.length === 0) {
    return {
      model: 'Spatial-Temporal Decay Clustering v2.0',
      totalIncidentsAnalyzed: 0,
      predictedZones: [],
      timestamp: new Date().toISOString()
    };
  }

  const rawClusters = clusterIncidents(incidents, 750);
  const predictedZones = [];

  for (let cIdx = 0; cIdx < rawClusters.length; cIdx++) {
    const cluster = rawClusters[cIdx];
    let totalScore = 0;
    let sumLat = 0;
    let sumLng = 0;
    const typeDistribution = {};

    let maxDistance = 300; // minimum radius in meters

    // First pass: Centroid
    cluster.forEach((inc) => {
      const lat = inc.location?.lat ?? inc.geoPoint?.coordinates?.[1];
      const lng = inc.location?.lng ?? inc.geoPoint?.coordinates?.[0];
      sumLat += lat;
      sumLng += lng;
      typeDistribution[inc.type] = (typeDistribution[inc.type] || 0) + 1;
    });

    const centroidLat = sumLat / cluster.length;
    const centroidLng = sumLng / cluster.length;

    // Second pass: Calculate radius & time-decayed severity score
    cluster.forEach((inc) => {
      const lat = inc.location?.lat ?? inc.geoPoint?.coordinates?.[1];
      const lng = inc.location?.lng ?? inc.geoPoint?.coordinates?.[0];
      const dist = haversineDistanceMeters(centroidLat, centroidLng, lat, lng);
      if (dist > maxDistance) {
        maxDistance = dist;
      }

      const timeWeight = calculateTimeDecayWeight(inc.createdAt);
      const severityWeight = SEVERITY_WEIGHTS[inc.severity] || 2.0;
      const urgencyBoost = (inc.aiAnalysis?.urgencyScore || 5) / 10;

      const incidentContribution = severityWeight * timeWeight * (1 + urgencyBoost * 0.3);
      totalScore += incidentContribution;
    });

    // Normalize raw score to a 0-100 scale
    // 1 incident of low = ~3-5, 5 critical incidents = 80-100
    const normalizedRiskScore = Math.min(100, Math.round(totalScore * 8.5));

    let riskLevel = 'low';
    let suggestedAction = 'Routine tourist patrol coverage.';

    if (normalizedRiskScore >= 75) {
      riskLevel = 'critical';
      suggestedAction = 'URGENT: Issue automated geofence push notification to tourists in area. Deploy high-visibility patrol units.';
    } else if (normalizedRiskScore >= 50) {
      riskLevel = 'high';
      suggestedAction = 'HIGH PRIORITY: Increase surveillance patrols, check street illumination and CCTV coverage.';
    } else if (normalizedRiskScore >= 25) {
      riskLevel = 'medium';
      suggestedAction = 'MODERATE: Advisory notice on mobile dashboard; monitor recurring incident frequency.';
    }

    // Identify primary hazard
    const dominantType = Object.keys(typeDistribution).reduce((a, b) =>
      typeDistribution[a] > typeDistribution[b] ? a : b
    );

    // Approximate circular polygon around centroid
    const numPoints = 8;
    const polygonCoordinates = [];
    const radiusDegLat = maxDistance / 111320;
    const radiusDegLng = maxDistance / (111320 * Math.cos((centroidLat * Math.PI) / 180));

    for (let p = 0; p <= numPoints; p++) {
      const angle = (p * 2 * Math.PI) / numPoints;
      const pLng = centroidLng + radiusDegLng * Math.sin(angle);
      const pLat = centroidLat + radiusDegLat * Math.cos(angle);
      polygonCoordinates.push([Number(pLng.toFixed(6)), Number(pLat.toFixed(6))]);
    }

    predictedZones.push({
      clusterId: `cluster_${cIdx + 1}`,
      center: {
        lat: Number(centroidLat.toFixed(6)),
        lng: Number(centroidLng.toFixed(6))
      },
      radiusMeters: Math.round(maxDistance + 100),
      riskScore: normalizedRiskScore,
      riskLevel,
      incidentCount: cluster.length,
      dominantCategory: dominantType,
      categoryDistribution: typeDistribution,
      suggestedAction,
      geoPolygon: {
        type: 'Polygon',
        coordinates: [polygonCoordinates]
      },
      explanation: `Calculated AI Risk Score ${normalizedRiskScore}/100 from ${cluster.length} time-decayed incident reports (dominant: ${dominantType}).`
    });
  }

  // Sort descending by risk score
  predictedZones.sort((a, b) => b.riskScore - a.riskScore);

  return {
    model: 'Spatial-Temporal Decay Clustering v2.0',
    totalIncidentsAnalyzed: incidents.length,
    clustersFound: predictedZones.length,
    predictedZones,
    timestamp: new Date().toISOString()
  };
}

/**
 * Feature 7: AI Smart Feature - Assess Tourist Location Risk
 * Analyzes location + time of day + nearby incidents & risk zones
 * Returns AI risk score, summary, and contextual natural-language safety tip
 */
async function assessTouristRisk({ lat, lng, timeOfDay, radiusMeters = 1500 }) {
  const RiskZone = require('../models/RiskZone');
  const { isPointInRiskZone } = require('./geoUtils');

  // Determine current hour & time classification
  const now = new Date();
  const currentHour = now.getHours();
  const isNight = timeOfDay
    ? ['night', 'late night', 'evening', 'after 9pm', 'after 8pm'].some((t) => timeOfDay.toLowerCase().includes(t)) ||
      (/\d{1,2}/.test(timeOfDay) && (parseInt(timeOfDay.match(/\d{1,2}/)[0], 10) >= 20 || parseInt(timeOfDay.match(/\d{1,2}/)[0], 10) <= 5))
    : (currentHour >= 21 || currentHour <= 5);

  const formattedTimeOfDay = timeOfDay || (isNight ? 'night (after 9 PM)' : 'daytime');

  // 1. Query nearby active Risk Zones
  const allZones = await RiskZone.find({ active: true }).lean();
  const nearbyZones = [];

  for (const zone of allZones) {
    let matches = false;
    let dist = 0;
    if (zone.center && zone.center.lat != null && zone.center.lng != null) {
      dist = haversineDistanceMeters(lat, lng, zone.center.lat, zone.center.lng);
      if (dist <= (zone.radiusMeters || 500) + radiusMeters) {
        matches = true;
      }
    } else if (isPointInRiskZone({ lat, lng }, zone)) {
      matches = true;
      dist = 0;
    }

    if (matches) {
      nearbyZones.push({
        id: zone._id,
        name: zone.name,
        riskLevel: zone.riskLevel,
        category: zone.category,
        description: zone.description,
        distanceMeters: Math.round(dist)
      });
    }
  }

  // 2. Query nearby recent Incidents (past 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const incidents = await Incident.find({
    createdAt: { $gte: thirtyDaysAgo }
  }).lean();

  const nearbyIncidents = [];
  let nightIncidentCount = 0;

  for (const inc of incidents) {
    const incLat = inc.location?.lat;
    const incLng = inc.location?.lng;
    if (incLat == null || incLng == null) continue;

    const dist = haversineDistanceMeters(lat, lng, incLat, incLng);
    if (dist <= radiusMeters) {
      const incHour = new Date(inc.createdAt).getHours();
      const incIsNight = incHour >= 21 || incHour <= 5;
      if (incIsNight) nightIncidentCount++;

      nearbyIncidents.push({
        id: inc._id,
        type: inc.type,
        severity: inc.severity,
        description: inc.description,
        isNight: incIsNight,
        distanceMeters: Math.round(dist)
      });
    }
  }

  // 3. Compute Risk Score (0 - 100)
  let baseScore = 15; // baseline safe score

  // Add risk from zones
  nearbyZones.forEach((z) => {
    if (z.riskLevel === 'critical') baseScore += 35;
    else if (z.riskLevel === 'high') baseScore += 25;
    else if (z.riskLevel === 'medium') baseScore += 15;
    else baseScore += 8;
  });

  // Add risk from incidents
  nearbyIncidents.forEach((inc) => {
    const weight = SEVERITY_WEIGHTS[inc.severity] || 2.0;
    baseScore += weight * 3;
  });

  // Nighttime multiplier if nighttime incidents or general night traveling
  if (isNight) {
    if (nightIncidentCount > 0) {
      baseScore += Math.min(25, nightIncidentCount * 8);
    } else {
      baseScore += 10;
    }
  }

  const finalRiskScore = Math.min(100, Math.max(5, Math.round(baseScore)));

  let riskLevel = 'low';
  if (finalRiskScore >= 75) riskLevel = 'critical';
  else if (finalRiskScore >= 50) riskLevel = 'high';
  else if (finalRiskScore >= 25) riskLevel = 'medium';

  // 4. Synthesize Summary & Natural-Language Safety Tip
  let summary = '';
  let safetyTip = '';

  const incidentTypes = [...new Set(nearbyIncidents.map((i) => i.type))];
  const typeStr = incidentTypes.length > 0 ? incidentTypes.join('/') : 'general safety';

  if (nearbyIncidents.length > 0 && isNight) {
    summary = `This area has had ${nearbyIncidents.length} reported incident${nearbyIncidents.length > 1 ? 's' : ''} (${nightIncidentCount} after 9:00 PM) within ${Math.round(radiusMeters)}m.`;
    safetyTip = `This area has had ${nearbyIncidents.length} reported incident${nearbyIncidents.length > 1 ? 's' : ''} after 9pm — consider traveling with others, keeping your Digital Tourist ID accessible, and sticking to well-lit main avenues.`;
  } else if (nearbyZones.length > 0) {
    const dominantZone = nearbyZones[0];
    summary = `Active ${dominantZone.riskLevel.toUpperCase()} risk zone detected: '${dominantZone.name}' (${dominantZone.category}).`;
    safetyTip = `You are near '${dominantZone.name}' (${dominantZone.riskLevel} risk). Keep emergency SOS button on standby and stay aware of your immediate surroundings.`;
  } else if (nearbyIncidents.length > 0) {
    summary = `${nearbyIncidents.length} recent ${typeStr} incident${nearbyIncidents.length > 1 ? 's' : ''} recorded within ${Math.round(radiusMeters)}m.`;
    safetyTip = `Moderate caution advised: Keep personal belongings and passport secure. Avoid unverified street solicitors.`;
  } else {
    summary = `No active risk zones or high-frequency incidents detected in this immediate vicinity.`;
    safetyTip = `Area currently classified as LOW risk. Enjoy your visit, stay hydrated, and keep emergency contacts updated.`;
  }

  return {
    success: true,
    riskScore: finalRiskScore,
    riskLevel,
    summary,
    safetyTip,
    context: {
      location: { lat, lng },
      timeOfDay: formattedTimeOfDay,
      isNightTime: isNight,
      nearbyRiskZonesCount: nearbyZones.length,
      nearbyIncidentsCount: nearbyIncidents.length,
      nightIncidentsCount: nightIncidentCount
    },
    nearbyRiskZones: nearbyZones,
    nearbyIncidents: nearbyIncidents.slice(0, 5)
  };
}

module.exports = {
  computePredictedRiskZones,
  calculateTimeDecayWeight,
  clusterIncidents,
  assessTouristRisk,
  SEVERITY_WEIGHTS
};
