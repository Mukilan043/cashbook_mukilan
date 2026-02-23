const express = require('express');
const router = express.Router();
const {
	signup,
	login,
	getProfile,
	updateProfile,
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;

