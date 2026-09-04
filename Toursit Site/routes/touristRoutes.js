const express = require('express');
const router = express.Router();

// Controllers
const {
  register,
  login,
  getMe
} = require('../controllers/authController');

const {
  getProfile,
  updateProfile,
  getSafetyInfo,
  getSafetyResources,
  getTouristDashboard
} = require('../controllers/touristController');

const {
  generateDigitalId,
  verifyDigitalId,
  getMyDigitalId
} = require('../controllers/digitalIdController');

const {
  pingLocation,
  getLocationAlerts,
  getNearbyAlerts
} = require('../controllers/locationController');

const {
  triggerSOS,
  getSOSStatus,
  cancelSOS
} = require('../controllers/sosController');

const {
  createIncident,
  getMyIncidents,
  assessRiskEndpoint,
  incidentTriageEndpoint
} = require('../controllers/incidentController');

// Middleware
const { protect, requireRole, optionalAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');

// ----------------------------------------------------
// AUTH ENDPOINTS
// ----------------------------------------------------
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);

// ----------------------------------------------------
// FEATURE 1 — TOURIST PROFILE & SAFETY INFORMATION
// ----------------------------------------------------
router.get('/profile', protect, requireRole('tourist'), getProfile);
router.put('/profile', protect, requireRole('tourist'), updateProfile);
router.get('/safety-info', optionalAuth, getSafetyInfo);

// ----------------------------------------------------
// FEATURE 2 — DIGITAL TOURIST ID (QR)
// ----------------------------------------------------
router.post('/id/generate', protect, requireRole('tourist'), generateDigitalId);
router.get('/id', protect, requireRole('tourist'), getMyDigitalId);
// Backward compatibility aliases
router.post('/digital-id', protect, requireRole('tourist'), generateDigitalId);
router.get('/digital-id', protect, requireRole('tourist'), getMyDigitalId);
router.post('/digital-id/verify', optionalAuth, verifyDigitalId);

// ----------------------------------------------------
// FEATURE 3 — LOCATION-BASED SAFETY
// ----------------------------------------------------
router.post('/location/update', protect, requireRole('tourist'), pingLocation);
router.get('/location/alerts', protect, requireRole('tourist'), getLocationAlerts);

// ----------------------------------------------------
// FEATURE 4 — EMERGENCY / SOS
// ----------------------------------------------------
router.post('/sos/trigger', protect, requireRole('tourist'), triggerSOS);
router.get('/sos/:sosId/status', protect, getSOSStatus);
router.post('/sos/:sosId/cancel', protect, requireRole('tourist'), cancelSOS);

// ----------------------------------------------------
// FEATURE 5 — RISK & SAFETY ALERTS
// ----------------------------------------------------
router.get('/alerts/nearby', protect, requireRole('tourist'), getNearbyAlerts);

// ----------------------------------------------------
// FEATURE 6 — INCIDENT REPORTING
// ----------------------------------------------------
router.post('/incidents', protect, requireRole('tourist'), upload.array('media', 5), createIncident);
router.get('/incidents/mine', protect, requireRole('tourist'), getMyIncidents);

// ----------------------------------------------------
// FEATURE 7 — AI / SMART FEATURES
// ----------------------------------------------------
router.post('/ai/assess-risk', optionalAuth, assessRiskEndpoint);
router.post('/ai/incident-triage', optionalAuth, incidentTriageEndpoint);

// ----------------------------------------------------
// FEATURE 8 — SAFETY RESOURCES
// ----------------------------------------------------
router.get('/resources', optionalAuth, getSafetyResources);

// ----------------------------------------------------
// TOURIST DASHBOARD OVERVIEW
// ----------------------------------------------------
router.get('/dashboard', protect, requireRole('tourist'), getTouristDashboard);

module.exports = router;
