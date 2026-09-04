const mongoose = require('mongoose');

const responseUnitSchema = new mongoose.Schema(
  {
    unitId: {
      type: String,
      required: [true, 'Unit ID is required (e.g. PATROL-101)'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Unit type is required'],
      enum: {
        values: ['police_patrol', 'medical_trauma', 'tourism_helpline', 'fire_rescue'],
        message: 'Invalid unit type'
      },
      default: 'police_patrol',
      index: true
    },
    zone: {
      type: String,
      required: [true, 'Jurisdiction/zone is required'],
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ['available', 'dispatched', 'maintenance', 'offline'],
        message: 'Status must be available, dispatched, maintenance, or offline'
      },
      default: 'available',
      index: true
    },
    currentLocation: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 },
      address: { type: String, trim: true, default: '' }
    },
    contactNumber: {
      type: String,
      trim: true
    },
    callSign: {
      type: String,
      trim: true
    },
    activeSosId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SOSAlert',
      default: null
    },
    lastDispatchedAt: {
      type: Date
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

// Fallback to name if not provided
responseUnitSchema.pre('save', function (next) {
  if (!this.name) {
    this.name = `${this.type.replace('_', ' ').toUpperCase()} #${this.unitId}`;
  }
  next();
});

module.exports = mongoose.model('ResponseUnit', responseUnitSchema);
