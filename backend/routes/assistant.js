const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { chatWithAssistant } = require('../controllers/assistantController');

router.use(authenticateToken);

router.post('/chat', chatWithAssistant);

module.exports = router;
