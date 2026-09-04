const express = require('express');
const router = express.Router();
const { pingLocation, getLatestLocation } = require('../controllers/locationController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/ping', protect, requireRole('tourist'), pingLocation);
router.get('/latest', protect, getLatestLocation);

module.exports = router;
