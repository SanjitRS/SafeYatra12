const SafetyResource = require('../models/SafetyResource');
const { AppError } = require('../middleware/errorHandler');

const getSafetyResources = async (req, res, next) => {
  try {
    const { region } = req.query;

    let resources = [];
    if (region) {
      // Find resources matching region case-insensitively, or fallback to global/general
      resources = await SafetyResource.find({
        $or: [
          { region: new RegExp(`^${region.trim()}$`, 'i') },
          { region: 'general' },
          { region: 'global' }
        ]
      });
    } else {
      resources = await SafetyResource.find();
    }

    // Default safety resource if empty in DB
    if (resources.length === 0) {
      return res.status(200).json({
        success: true,
        region: region || 'default',
        emergencyContacts: [
          { label: 'Tourist Police Emergency Hotline', number: '112', available24x7: true },
          { label: 'Medical Ambulance Dispatch', number: '108', available24x7: true },
          { label: 'Fire & Rescue Service', number: '101', available24x7: true }
        ],
        guidelines: [
          {
            title: 'Keep Digital Tourist ID Accessible',
            body: 'Keep your QR-verified Tourist ID saved on your mobile device or printed copy for quick authority verification.',
            category: 'general'
          },
          {
            title: 'Emergency Geofencing Awareness',
            body: 'Enable periodic location pings so authorities can alert you immediately if you enter a declared high-risk zone.',
            category: 'advisory'
          }
        ],
        embassyContacts: []
      });
    }

    return res.status(200).json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (error) {
    next(error);
  }
};

const createOrUpdateSafetyResource = async (req, res, next) => {
  try {
    const { region, displayName, emergencyContacts, guidelines, embassyContacts } = req.body;

    if (!region || !displayName) {
      return next(new AppError('Region and displayName are required fields', 400, 'FIELDS_REQUIRED'));
    }

    const resource = await SafetyResource.findOneAndUpdate(
      { region: region.toLowerCase().trim() },
      {
        $set: {
          region: region.toLowerCase().trim(),
          displayName,
          emergencyContacts: emergencyContacts || [],
          guidelines: guidelines || [],
          embassyContacts: embassyContacts || []
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Safety resources saved successfully',
      data: resource
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSafetyResources,
  createOrUpdateSafetyResource
};
