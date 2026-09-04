const express = require('express');
const router = express.Router();
const { getSafetyResources, createOrUpdateSafetyResource } = require('../controllers/safetyController');
const { protect, requireRole, optionalAuth } = require('../middleware/auth');

router.get('/resources', optionalAuth, getSafetyResources);
router.post('/resources', protect, requireRole('authority'), createOrUpdateSafetyResource);

module.exports = router;
