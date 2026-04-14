const express = require('express');
const router = express.Router();
const { register, login, getProfile, sendOTP, verifyOTP, resetPasswordWithOTP } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPasswordWithOTP);

// Protected route
router.get('/profile', authenticateToken, getProfile);

module.exports = router;
