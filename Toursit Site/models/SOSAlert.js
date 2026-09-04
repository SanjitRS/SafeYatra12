const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema(
  {
    touristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tourist ID is required'],
      index: true
    },
    // Coordinates object for easy client consumption
    location: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required']
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required']
      }
    },
    // GeoJSON Point for MongoDB 2dsphere spatial queries
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
    message: {
      type: String,
      trim: true,
      default: 'Emergency SOS triggered! Urgent assistance required.'
    },
    note: {
      type: String,
      trim: true
    },
    voiceNoteUrl: {
      type: String,
      trim: true
    },
    touristProfileSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    triggeredAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['new', 'active', 'acknowledged', 'unit_dispatched', 'resolved', 'escalated', 'cancelled'],
      default: 'active',
      index: true
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      trim: true
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'critical',
      index: true
    },
    notes: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        authorName: {
          type: String,
          trim: true
        },
        note: {
          type: String,
          required: true,
          trim: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    assignedUnit: {
      unitId: { type: String, trim: true },
      unitRef: { type: mongoose.Schema.Types.ObjectId, ref: 'ResponseUnit' },
      unitType: { type: String, trim: true },
      eta: { type: Number },
      dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      dispatchedAt: { type: Date },
      notes: { type: String, trim: true }
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    respondingAuthorityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    acknowledgedAt: {
      type: Date
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolvedAt: {
      type: Date
    },
    resolutionNotes: {
      type: String,
      trim: true
    },
    closingNote: {
      type: String,
      trim: true
    },
    isEscalated: {
      type: Boolean,
      default: false,
      index: true
    },
    escalatedAt: {
      type: Date
    },
    escalationReason: {
      type: String,
      trim: true
    },
    priorityScore: {
      type: Number,
      default: 10 // Max priority for SOS
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

// Pre-save hook to ensure geoPoint matches location [lng, lat]
sosAlertSchema.pre('validate', function (next) {
  if (this.location && this.location.lat != null && this.location.lng != null) {
    this.geoPoint = {
      type: 'Point',
      coordinates: [this.location.lng, this.location.lat]
    };
  }
  next();
});

// 2dsphere spatial index
sosAlertSchema.index({ geoPoint: '2dsphere' });

module.exports = mongoose.model('SOSAlert', sosAlertSchema);
