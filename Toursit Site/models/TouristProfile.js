const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const itineraryItemSchema = new mongoose.Schema(
  {
    location: { type: String, required: true, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    notes: { type: String }
  },
  { _id: false }
);

const touristProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    passportOrIdNumber: {
      type: String,
      trim: true
    },
    photoUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
    },
    emergencyContacts: [emergencyContactSchema],
    medicalInfo: {
      allergies: [{ type: String, trim: true }],
      conditions: [{ type: String, trim: true }],
      bloodGroup: {
        type: String,
        trim: true,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown', ''],
        default: 'Unknown'
      }
    },
    itinerary: [itineraryItemSchema],
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
    },
    travelDocumentsMeta: {
      visaNumber: { type: String, trim: true },
      insuranceProvider: { type: String, trim: true },
      insurancePolicyNumber: { type: String, trim: true },
      primaryHotel: { type: String, trim: true }
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

module.exports = mongoose.model('TouristProfile', touristProfileSchema);
