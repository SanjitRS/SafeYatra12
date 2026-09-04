const mongoose = require('mongoose');

const locationPingSchema = new mongoose.Schema(
  {
    touristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    lat: {
      type: Number
    },
    lng: {
      type: Number
    },
    location: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      }
    },
    // GeoJSON Point for 2dsphere indexing
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
    activeRiskZones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RiskZone'
      }
    ],
    batteryLevel: {
      type: Number
    },
    speed: {
      type: Number
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
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

locationPingSchema.pre('validate', function (next) {
  if (this.lat != null && this.lng != null && (!this.location || this.location.lat == null)) {
    this.location = { lat: this.lat, lng: this.lng };
  } else if (this.location && this.location.lat != null && this.location.lng != null) {
    this.lat = this.location.lat;
    this.lng = this.location.lng;
  }

  if (this.location && this.location.lat != null && this.location.lng != null) {
    this.geoPoint = {
      type: 'Point',
      coordinates: [this.location.lng, this.location.lat]
    };
  }
  next();
});

locationPingSchema.index({ geoPoint: '2dsphere' });

/**
 * Prune older pings for a tourist to keep rolling history of last N points
 */
locationPingSchema.statics.pruneRollingHistory = async function (touristId, maxPoints = 20) {
  try {
    const pings = await this.find({ touristId })
      .sort({ timestamp: -1 })
      .select('_id')
      .lean();

    if (pings.length > maxPoints) {
      const pingsToDelete = pings.slice(maxPoints).map((p) => p._id);
      await this.deleteMany({ _id: { $in: pingsToDelete } });
    }
  } catch (err) {
    console.warn('[LocationPing] pruneRollingHistory error:', err.message);
  }
};

module.exports = mongoose.model('LocationPing', locationPingSchema);
