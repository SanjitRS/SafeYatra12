const { z } = require('zod');

/**
 * Higher-order middleware to validate incoming request body against a Zod schema
 * @param {z.ZodSchema} schema 
 */
const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }));

      return res.status(400).json({
        error: {
          message: 'Invalid request payload',
          code: 'VALIDATION_ERROR',
          details
        }
      });
    }
    next(error);
  }
};

/**
 * Validate query parameters against a Zod schema
 */
const validateQuery = (schema) => (req, res, next) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      }));

      return res.status(400).json({
        error: {
          message: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details
        }
      });
    }
    next(error);
  }
};

module.exports = {
  validateBody,
  validateQuery
};
