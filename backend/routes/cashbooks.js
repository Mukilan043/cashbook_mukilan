const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getUserCashbooks,
  getCashbookById,
  createCashbook,
  updateCashbook,
  deleteCashbook
} = require('../controllers/cashbookController');

router.use(authenticateToken);

router.get('/', getUserCashbooks);
router.get('/:id', getCashbookById);
router.post('/', createCashbook);
router.put('/:id', updateCashbook);
router.delete('/:id', deleteCashbook);

module.exports = router;





