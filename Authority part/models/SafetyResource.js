const mongoose = require('mongoose');

const safetyResourceSchema = new mongoose.Schema(
  {
    region: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    displayName: {
      type: String,
      required: true
    },
    emergencyContacts: [
      {
        label: { type: String, required: true },
        number: { type: String, required: true },
        available24x7: { type: Boolean, default: true }
      }
    ],
    guidelines: [
      {
        title: { type: String, required: true },
        body: { type: String, required: true },
        category: { type: String, default: 'general' }
      }
    ],
    embassyContacts: [
      {
        country: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String },
        email: { type: String }
      }
    ]
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

module.exports = mongoose.model('SafetyResource', safetyResourceSchema);
