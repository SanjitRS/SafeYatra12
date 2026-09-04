const express = require('express');
const router = express.Router();
const { triggerSOS, getActiveSOSAlerts, updateSOSStatus } = require('../controllers/sosController');
const { protect, requireRole } = require('../middleware/auth');
const { sosLimiter } = require('../middleware/rateLimiter');

// Tourist triggers SOS
router.post('/', sosLimiter, protect, requireRole('tourist'), triggerSOS);

// Authority operations
router.get('/active', protect, requireRole('authority', 'dispatcher', 'admin'), getActiveSOSAlerts);
router.patch('/:id', protect, requireRole('authority', 'dispatcher', 'admin'), updateSOSStatus);
router.put('/:id', protect, requireRole('authority', 'dispatcher', 'admin'), updateSOSStatus);

module.exports = router;
