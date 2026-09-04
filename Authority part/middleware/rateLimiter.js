const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      }
    });
  }
});

const sosLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 SOS triggers per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: 'Too many emergency SOS triggers in a short window. Please wait a moment before sending another alert.',
        code: 'SOS_RATE_LIMIT_EXCEEDED'
      }
    });
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message: 'Too many requests received. Please slow down.',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    });
  }
});

module.exports = {
  authLimiter,
  sosLimiter,
  apiLimiter
};
