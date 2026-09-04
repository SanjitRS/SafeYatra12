const mongoose = require('mongoose');

const riskZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Risk zone name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true
    },
    category: {
      type: String,
      enum: ['crime', 'natural_hazard', 'political_unrest', 'health_warning', 'traffic', 'other'],
      default: 'crime',
      index: true
    },
    // GeoJSON representation for MongoDB 2dsphere spatial indexing
    location: {
      type: {
        type: String,
        enum: ['Point', 'Polygon'],
        default: 'Polygon'
      },
      // For Polygon: [[[lng, lat], [lng, lat], ...]]
      // For Point: [lng, lat]
      coordinates: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      }
    },
    geometry: {
      type: mongoose.Schema.Types.Mixed
    },
    // Helper fields for circular radius zones
    center: {
      lat: { type: Number },
      lng: { type: Number }
    },
    radiusMeters: {
      type: Number,
      default: 500
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    incidentCount: {
      type: Number,
      default: 0
    },
    aiRiskScore: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Pre-validate hook to ensure location and geometry stay synchronized
riskZoneSchema.pre('validate', function (next) {
  if (this.geometry && !this.location) {
    this.location = this.geometry;
  } else if (this.location && !this.geometry) {
    this.geometry = this.location;
  }
  next();
});

// 2dsphere index for MongoDB geospatial queries ($geoWithin, $geoIntersects, $nearSphere)
riskZoneSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('RiskZone', riskZoneSchema);
