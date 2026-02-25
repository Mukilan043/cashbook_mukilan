const express = require('express');
const router = express.Router();
const {
	signup,
	login,
	getProfile,
	updateProfile,
	forgotPasswordVerify,
	resetPassword,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password/verify', forgotPasswordVerify);
router.post('/forgot-password/reset', resetPassword);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;

