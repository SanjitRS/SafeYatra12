const express = require('express');
const router = express.Router();
const {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus
} = require('../controllers/incidentController');
const { protect, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Create incident (tourist or authority, accepts multipart/form-data or JSON)
router.post('/', protect, upload.array('media', 5), createIncident);

// List incidents (tourist gets own, authority gets all)
router.get('/', protect, getIncidents);

// Get single incident
router.get('/:id', protect, getIncidentById);

// Update status (authority only)
router.patch('/:id/status', protect, requireRole('authority'), updateIncidentStatus);
router.put('/:id/status', protect, requireRole('authority'), updateIncidentStatus);

module.exports = router;
