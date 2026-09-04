/**
 * Geospatial utility functions for distance calculations,
 * point-in-polygon tests, and spatial indexing helpers.
 */

// Earth radius in meters
const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates Haversine distance between two coordinates in meters.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} distance in meters
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Ray-casting algorithm to test if a point (lat, lng) is inside a GeoJSON Polygon coordinates ring.
 * Coordinates are [lng, lat].
 * @param {[number, number]} point [lng, lat]
 * @param {Array<[number, number]>} polygonRing array of [lng, lat] points
 * @returns {boolean}
 */
function isPointInPolygonRing(point, polygonRing) {
  const [px, py] = point; // px = lng, py = lat
  let inside = false;

  for (let i = 0, j = polygonRing.length - 1; i < polygonRing.length; j = i++) {
    const [xi, yi] = polygonRing[i];
    const [xj, yj] = polygonRing[j];

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Checks if a point {lat, lng} is inside a given RiskZone document.
 * Handles both Polygon geometry and Point + radiusMeters.
 * @param {{lat: number, lng: number}} point
 * @param {Object} riskZone
 * @returns {boolean}
 */
function isPointInRiskZone(point, riskZone) {
  const { lat, lng } = point;

  if (riskZone.location && riskZone.location.type === 'Polygon') {
    const coordinates = riskZone.location.coordinates;
    if (Array.isArray(coordinates) && coordinates.length > 0) {
      // GeoJSON Polygon coordinates: array of linear rings (first ring is exterior)
      const exteriorRing = coordinates[0];
      return isPointInPolygonRing([lng, lat], exteriorRing);
    }
  }

  // Fallback or explicit center + radius
  if (riskZone.center && riskZone.center.lat != null && riskZone.center.lng != null) {
    const dist = haversineDistanceMeters(lat, lng, riskZone.center.lat, riskZone.center.lng);
    const radius = riskZone.radiusMeters || 500;
    return dist <= radius;
  }

  if (riskZone.location && riskZone.location.type === 'Point' && Array.isArray(riskZone.location.coordinates)) {
    const [zoneLng, zoneLat] = riskZone.location.coordinates;
    const dist = haversineDistanceMeters(lat, lng, zoneLat, zoneLng);
    const radius = riskZone.radiusMeters || 500;
    return dist <= radius;
  }

  return false;
}

module.exports = {
  haversineDistanceMeters,
  isPointInPolygonRing,
  isPointInRiskZone,
  EARTH_RADIUS_METERS
};
