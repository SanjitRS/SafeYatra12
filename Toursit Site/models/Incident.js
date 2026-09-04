const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    touristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['theft', 'assault', 'harassment', 'medical', 'hazard', 'accident', 'scam', 'natural_disaster', 'other'],
      required: [true, 'Incident type is required'],
      index: true
    },
    description: {
      type: String,
      required: [true, 'Incident description is required'],
      trim: true
    },
    location: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required']
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required']
      },
      address: {
        type: String,
        trim: true
      }
    },
    // GeoJSON Point for MongoDB 2dsphere spatial index
    geoPoint: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true
      }
    },
    photoUrl: {
      type: String,
      trim: true
    },
    mediaUrls: [
      {
        type: String
      }
    ],
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved'],
      default: 'open',
      index: true
    },
    // AI / Smart classifier analysis output
    aiAnalysis: {
      predictedSeverity: { type: String },
      urgencyScore: { type: Number }, // 1-10
      detectedKeywords: [{ type: String }],
      suggestedAction: { type: String },
      confidence: { type: Number },
      explanation: { type: String },
      analyzedAt: { type: Date }
    },
    assignedOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolutionSummary: {
      type: String,
      trim: true
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

// Pre-save hook to ensure geoPoint matches location [lng, lat] and sync aliases
incidentSchema.pre('validate', function (next) {
  if (this.touristId && !this.reportedBy) {
    this.reportedBy = this.touristId;
  } else if (this.reportedBy && !this.touristId) {
    this.touristId = this.reportedBy;
  }

  if (this.photoUrl && (!this.mediaUrls || this.mediaUrls.length === 0)) {
    this.mediaUrls = [this.photoUrl];
  } else if (!this.photoUrl && this.mediaUrls && this.mediaUrls.length > 0) {
    this.photoUrl = this.mediaUrls[0];
  }

  if (this.location && this.location.lat != null && this.location.lng != null) {
    this.geoPoint = {
      type: 'Point',
      coordinates: [this.location.lng, this.location.lat]
    };
  }
  next();
});

// 2dsphere spatial index
incidentSchema.index({ geoPoint: '2dsphere' });

module.exports = mongoose.model('Incident', incidentSchema);
