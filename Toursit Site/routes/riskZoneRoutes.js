const express = require('express');
const router = express.Router();
const {
  getRiskZones,
  createRiskZone,
  updateRiskZone,
  getPredictedRiskZones,
  reevaluateZones
} = require('../controllers/riskZoneController');
const { protect, requireRole, optionalAuth } = require('../middleware/auth');

// Public or authenticated list of risk zones
router.get('/', optionalAuth, getRiskZones);

// AI Feature: Predict emerging risk zones using spatial clustering and time-decay
router.get('/predicted', optionalAuth, getPredictedRiskZones);

// Authority operations
router.post('/', protect, requireRole('authority'), createRiskZone);
router.patch('/:id', protect, requireRole('authority'), updateRiskZone);
router.put('/:id', protect, requireRole('authority'), updateRiskZone);
router.post('/reevaluate', protect, requireRole('authority'), reevaluateZones);

module.exports = router;
