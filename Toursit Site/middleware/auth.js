const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('./errorHandler');

const protect = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication required. Please provide a valid Bearer token.', 401, 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_tourist_safety_jwt_key_2026_x98f');
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return next(new AppError('User belonging to this token no longer exists.', 401, 'USER_NOT_FOUND'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required before role check.', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: [${roles.join(', ')}]`,
          403,
          'FORBIDDEN_ROLE'
        )
      );
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_tourist_safety_jwt_key_2026_x98f');
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (user) {
      req.user = user;
    }
  } catch (err) {
    // Non-blocking for optional auth
  }

  next();
};

const authenticateAuthority = async (req, res, next) => {
  return protect(req, res, (err) => {
    if (err) return next(err);
    const allowedRoles = ['authority', 'dispatcher', 'admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Access restricted to authority, dispatcher, or admin personnel. Your role: '${req.user.role}'`,
          403,
          'FORBIDDEN_ROLE'
        )
      );
    }
    next();
  });
};

const authorizeRole = (roles) => {
  const roleList = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required before role check.', 401, 'UNAUTHORIZED'));
    }

    if (!roleList.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' is not authorized for this operation. Required: [${roleList.join(', ')}]`,
          403,
          'FORBIDDEN_ROLE'
        )
      );
    }

    next();
  };
};

module.exports = {
  protect,
  requireRole,
  optionalAuth,
  authenticateAuthority,
  authorizeRole
};

