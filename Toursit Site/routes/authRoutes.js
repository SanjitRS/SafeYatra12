const express = require('express');
const router = express.Router();
const { register, login, authorityLogin, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/authority/login', authLimiter, authorityLogin);
router.get('/me', protect, getMe);

module.exports = router;
