const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relation: { type: String, trim: true }
  },
  { _id: false }
);

const itineraryItemSchema = new mongoose.Schema(
  {
    location: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    notes: { type: String, trim: true }
  },
  { _id: false }
);

const touristSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    nationality: {
      type: String,
      trim: true,
      default: 'International'
    },
    passportNumber: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    emergencyContact: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ name: '', phone: '', relation: '' })
    },
    itinerary: {
      type: [itineraryItemSchema],
      default: []
    },
    medicalNotes: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ bloodGroup: 'Unknown', allergies: [], conditions: [], notes: '' })
    },
    digitalIdToken: {
      type: String,
      default: null
    },
    digitalIdExpiry: {
      type: Date,
      default: null
    },
    tripDates: {
      startDate: { type: Date },
      endDate: { type: Date }
    },
    accommodation: {
      type: String,
      trim: true
    },
    preferredLanguage: {
      type: String,
      trim: true,
      default: 'en'
    }
  },
  {
    timestamps: true,
    collection: 'tourists',
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

touristSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('Tourist', touristSchema);
