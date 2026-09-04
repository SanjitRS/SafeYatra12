const mongoose = require('mongoose');

const verificationLogSchema = new mongoose.Schema(
  {
    officerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Officer ID is required'],
      index: true
    },
    touristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    digitalTouristId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DigitalTouristID',
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      address: { type: String, trim: true, default: '' },
      zone: { type: String, trim: true, default: '' }
    },
    result: {
      type: String,
      required: [true, 'Verification result is required'],
      enum: {
        values: ['verified', 'invalid', 'expired', 'tampered', 'revoked', 'flagged'],
        message: 'Invalid verification result'
      },
      index: true
    },
    verificationMethod: {
      type: String,
      enum: ['qr_scan', 'manual_lookup', 'flag_action'],
      default: 'qr_scan'
    },
    reason: {
      type: String,
      trim: true
    },
    notes: {
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

module.exports = mongoose.model('VerificationLog', verificationLogSchema);
