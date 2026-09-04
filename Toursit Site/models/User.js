const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
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
    role: {
      type: String,
      enum: {
        values: ['tourist', 'authority', 'dispatcher', 'admin'],
        message: 'Role must be tourist, authority, dispatcher, or admin'
      },
      default: 'tourist'
    },
    zone: {
      type: String,
      trim: true,
      default: 'Central Zone'
    },
    jurisdiction: {
      type: String,
      trim: true,
      default: 'Central Zone'
    },
    badgeNumber: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    nationality: {
      type: String,
      trim: true,
      default: 'International'
    }
  },
  {
    timestamps: true,
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

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
