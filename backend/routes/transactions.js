const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getBalance,
  generateReport
} = require('../controllers/transactionController');

// All routes require authentication
router.use(authenticateToken);

// Transaction routes (all require cashbookId in params)
router.get('/cashbook/:cashbookId', getAllTransactions);
router.get('/cashbook/:cashbookId/balance', getBalance);
router.get('/cashbook/:cashbookId/reports/generate', generateReport);
router.get('/cashbook/:cashbookId/:id', getTransactionById);
router.post('/cashbook/:cashbookId', createTransaction);
router.put('/cashbook/:cashbookId/:id', updateTransaction);
router.delete('/cashbook/:cashbookId/:id', deleteTransaction);

module.exports = router;

