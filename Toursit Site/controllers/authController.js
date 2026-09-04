const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');
const Tourist = require('../models/Tourist');
const TouristProfile = require('../models/TouristProfile');
const { AppError } = require('../middleware/errorHandler');

// Zod validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['tourist', 'authority', 'dispatcher', 'admin']).default('tourist'),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  passportNumber: z.string().optional(),
  passportOrIdNumber: z.string().optional(),
  emergencyContact: z.any().optional(),
  emergencyContacts: z.any().optional(),
  medicalNotes: z.any().optional(),
  medicalInfo: z.any().optional(),
  itinerary: z.any().optional(),
  tripDates: z.any().optional(),
  accommodation: z.string().optional(),
  preferredLanguage: z.string().optional(),
  zone: z.string().optional(),
  jurisdiction: z.string().optional(),
  badgeNumber: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
      zone: user.zone || user.jurisdiction || 'Central Zone',
      jurisdiction: user.jurisdiction || user.zone || 'Central Zone'
    },
    process.env.JWT_SECRET || 'super_secret_tourist_safety_jwt_key_2026_x98f',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

const register = async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return next(new AppError('A user with this email already exists.', 409, 'EMAIL_EXISTS'));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);

    const user = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      passwordHash,
      role: validatedData.role,
      phone: validatedData.phone,
      nationality: validatedData.nationality || 'International',
      zone: validatedData.zone || 'Central Zone',
      jurisdiction: validatedData.jurisdiction || validatedData.zone || 'Central Zone',
      badgeNumber: validatedData.badgeNumber
    });

    // Auto-create initial profile & Tourist collection document for tourists
    let createdTourist = null;
    let createdProfile = null;
    if (user.role === 'tourist') {
      const passport = validatedData.passportNumber || validatedData.passportOrIdNumber || '';
      
      let contacts = [];
      if (Array.isArray(validatedData.emergencyContacts)) {
        contacts = validatedData.emergencyContacts;
      } else if (validatedData.emergencyContact) {
        contacts = typeof validatedData.emergencyContact === 'object'
          ? [validatedData.emergencyContact]
          : [{ name: String(validatedData.emergencyContact), phone: validatedData.phone || '', relation: 'Emergency Contact' }];
      }

      const medical = validatedData.medicalNotes || validatedData.medicalInfo || {
        allergies: [],
        conditions: [],
        bloodGroup: 'Unknown'
      };

      createdProfile = await TouristProfile.create({
        userId: user._id,
        passportOrIdNumber: passport,
        emergencyContacts: contacts,
        medicalInfo: {
          allergies: medical.allergies || [],
          conditions: medical.conditions || [],
          bloodGroup: medical.bloodGroup || 'Unknown'
        },
        itinerary: validatedData.itinerary || [],
        tripDates: validatedData.tripDates || {},
        accommodation: validatedData.accommodation || '',
        preferredLanguage: validatedData.preferredLanguage || 'en'
      });

      createdTourist = await Tourist.create({
        _id: user._id,
        name: user.name,
        email: user.email,
        passwordHash,
        nationality: user.nationality,
        passportNumber: passport,
        phone: user.phone,
        emergencyContact: contacts.length > 0 ? contacts[0] : (validatedData.emergencyContact || {}),
        itinerary: validatedData.itinerary || [],
        medicalNotes: medical,
        tripDates: validatedData.tripDates || {},
        accommodation: validatedData.accommodation || '',
        preferredLanguage: validatedData.preferredLanguage || 'en'
      });
    }

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        nationality: user.nationality,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    const isMatch = await user.comparePassword(validatedData.password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        nationality: user.nationality
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    let profile = null;
    let tourist = null;
    if (user && user.role === 'tourist') {
      [profile, tourist] = await Promise.all([
        TouristProfile.findOne({ userId: user._id }),
        Tourist.findById(user._id).select('-passwordHash')
      ]);
    }

    return res.status(200).json({
      success: true,
      user,
      profile,
      tourist,
      data: {
        user,
        profile,
        tourist
      }
    });
  } catch (error) {
    next(error);
  }
};

const authorityLogin = async (req, res, next) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await User.findOne({ email: validatedData.email.toLowerCase().trim() });
    if (!user) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    const isMatch = await user.comparePassword(validatedData.password);
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    const allowedRoles = ['authority', 'dispatcher', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return next(
        new AppError(
          `Unauthorized: User does not have authority, dispatcher, or admin privileges.`,
          403,
          'FORBIDDEN_AUTHORITY_ACCESS'
        )
      );
    }

    const token = generateToken(user);
    const zone = user.zone || user.jurisdiction || 'Central Zone';
    const jurisdiction = user.jurisdiction || user.zone || 'Central Zone';

    return res.status(200).json({
      success: true,
      message: 'Authority authentication successful',
      token,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          zone,
          jurisdiction,
          badgeNumber: user.badgeNumber || null
        }
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        zone,
        jurisdiction
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  authorityLogin,
  getMe,
  registerSchema,
  loginSchema
};

