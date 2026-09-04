const express = require('express');
const router = express.Router();

// Controllers
const { getDashboardSummary, getTouristsInZone } = require('../controllers/authorityController');
const {
  verifyTouristById,
  scanTouristQR,
  flagTourist,
  getVerificationAuditLog
} = require('../controllers/authorityVerificationController');
const {
  getActiveSOSAlerts,
  acknowledgeSOS,
  dispatchUnitToSOS,
  listUnits,
  registerOrUpdateUnit,
  resolveSOS,
  escalateSOS
} = require('../controllers/authoritySosController');
const { getIncidents } = require('../controllers/incidentController');

// Middleware
const { authenticateAuthority, authorizeRole } = require('../middleware/auth');

// All authority routes require authority, dispatcher, or admin role
router.use(authenticateAuthority);

// ----------------------------------------------------
// MODULE 1 — TOURIST ID VERIFICATION & AUDIT LOGGING
// ----------------------------------------------------

// Audit log of all verification scans (must precede :touristId parameter route)
router.get('/tourists/verify/log', getVerificationAuditLog);
router.get('/tourists/verify-log', getVerificationAuditLog);

// Look up a tourist by Digital Tourist ID / User ID
router.get('/tourists/verify/:touristId', verifyTouristById);

// Scan and verify QR signed token payload
router.post('/tourists/verify/scan', scanTouristQR);
router.post('/verify/scan', scanTouristQR);

// Read access for Authority backend to all reported incidents
router.get('/incidents', getIncidents);

// Flag tourist ID record (suspected fraud, lost ID)
router.post('/tourists/:touristId/flag', flagTourist);

// ----------------------------------------------------
// MODULE 2 — SOS DISPATCH MANAGEMENT
// ----------------------------------------------------

// List all active open SOS alerts sorted by severity and recency
router.get('/sos/active', getActiveSOSAlerts);

// Acknowledge SOS alert
router.post('/sos/:sosId/acknowledge', acknowledgeSOS);

// Dispatch response unit to SOS alert
router.post('/sos/:sosId/dispatch', dispatchUnitToSOS);

// Mark SOS alert as resolved
router.post('/sos/:sosId/resolve', resolveSOS);

// Escalate unresolved SOS alert
router.post('/sos/:sosId/escalate', escalateSOS);

// ----------------------------------------------------
// RESPONSE UNITS
// ----------------------------------------------------

// List available response units
router.get('/units', listUnits);

// Register or update a response unit
router.post('/units', registerOrUpdateUnit);

// ----------------------------------------------------
// EXISTING DASHBOARD & SITUATIONAL QUERIES
// ----------------------------------------------------

router.get('/dashboard-summary', getDashboardSummary);
router.get('/tourists-in-zone', getTouristsInZone);

module.exports = router;
