const express = require('express');
const multer = require('multer');
const { scanReceipt } = require('../controllers/receiptController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
});

router.post('/', upload.single('receipt'), scanReceipt);

module.exports = router;
