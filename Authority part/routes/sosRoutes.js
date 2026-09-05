const express = require('express');
const router = express.Router();
const { triggerSOS, getActiveSOSAlerts, updateSOSStatus } = require('../controllers/sosController');
const { protect, requireRole, optionalAuth } = require('../middleware/auth');
const { sosLimiter } = require('../middleware/rateLimiter');

// Tourist triggers SOS (supports both logged-in and guest/emergency mode)
router.post('/', sosLimiter, optionalAuth, triggerSOS);

// Authority operations
router.get('/active', optionalAuth, getActiveSOSAlerts);
router.patch('/:id', optionalAuth, updateSOSStatus);
router.put('/:id', optionalAuth, updateSOSStatus);

module.exports = router;
