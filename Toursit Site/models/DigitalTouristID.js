const mongoose = require('mongoose');

const digitalTouristIdSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    qrCodePayload: {
      type: String,
      required: true
    },
    qrCodeImage: {
      type: String // Base64 data URL string for immediate display
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked', 'flagged'],
      default: 'active',
      index: true
    },
    flags: [
      {
        flaggedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        reason: {
          type: String,
          required: true,
          trim: true
        },
        flaggedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    photoUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
    },
    verificationCount: {
      type: Number,
      default: 0
    },
    lastVerifiedAt: {
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

module.exports = mongoose.model('DigitalTouristID', digitalTouristIdSchema);
