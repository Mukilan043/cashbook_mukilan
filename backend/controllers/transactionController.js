const { getDb } = require('../database/db');
const PDFDocument = require('pdfkit');

function decodeCategoryFromDescription(value) {
  const raw = value || '';
  const match = raw.match(/^\s*\[#([^\]]+)\]\s*(.*)$/);
  if (!match) return { category: '', description: raw };
  return { category: (match[1] || '').trim(), description: (match[2] || '').trim() };
}

// Get all transactions for a cashbook
const getAllTransactions = async (req, res) => {
  const db = getDb();
  const { cashbookId } = req.params;
  const { type, startDate, endDate, sortBy = 'date', sortOrder = 'DESC' } = req.query || {};

  try {
    const ownership = await db.query('SELECT user_id FROM cashbooks WHERE id = $1', [cashbookId]);
    const cashbook = ownership.rows[0];
    if (!cashbook) {
      return res.status(404).json({ error: 'Cashbook not found' });
    }
    if (cashbook.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = 'SELECT * FROM transactions WHERE cashbook_id = $1';
    const params = [cashbookId];

    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND date <= $${params.length}`;
    }

    const validSortFields = { date: 'date', amount: 'amount', description: 'description', type: 'type' };
    const sortField = validSortFields[sortBy] || 'date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${order}, created_at DESC`;

    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Get single transaction
const getTransactionById = async (req, res) => {
  const db = getDb();
  const { id, cashbookId } = req.params;

  try {
    const result = await db.query(
      `SELECT t.* FROM transactions t
       INNER JOIN cashbooks c ON t.cashbook_id = c.id
       WHERE t.id = $1 AND t.cashbook_id = $2 AND c.user_id = $3`,
      [id, cashbookId, req.user.id]
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Create new transaction
const createTransaction = async (req, res) => {
  const db = getDb();
  const { cashbookId } = req.params;
  const { type, amount, description, date } = req.body || {};

  if (!type || !amount || !date) {
    return res.status(400).json({ error: 'Type, amount, and date are required' });
  }

  if (type !== 'inflow' && type !== 'outflow') {
    return res.status(400).json({ error: 'Type must be either "inflow" or "outflow"' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  try {
    const ownership = await db.query('SELECT user_id FROM cashbooks WHERE id = $1', [cashbookId]);
    const cashbook = ownership.rows[0];
    if (!cashbook) {
      return res.status(404).json({ error: 'Cashbook not found' });
    }
    if (cashbook.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const insert = await db.query(
      'INSERT INTO transactions (cashbook_id, type, amount, description, date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [cashbookId, type, amount, description || null, date]
    );
    const row = insert.rows[0];
    return res.status(201).json({ id: row.id, cashbook_id: cashbookId, type, amount, description, date });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Update transaction
const updateTransaction = async (req, res) => {
  const db = getDb();
  const { id, cashbookId } = req.params;
  const { type, amount, description, date } = req.body || {};

  if (type && type !== 'inflow' && type !== 'outflow') {
    return res.status(400).json({ error: 'Type must be either "inflow" or "outflow"' });
  }

  if (amount !== undefined && amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0' });
  }

  try {
    const ownership = await db.query(
      `SELECT t.id FROM transactions t
       INNER JOIN cashbooks c ON t.cashbook_id = c.id
       WHERE t.id = $1 AND t.cashbook_id = $2 AND c.user_id = $3`,
      [id, cashbookId, req.user.id]
    );
    const transaction = ownership.rows[0];
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (type) {
      updates.push(`type = $${idx++}`);
      params.push(type);
    }
    if (amount !== undefined) {
      updates.push(`amount = $${idx++}`);
      params.push(amount);
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      params.push(description);
    }
    if (date) {
      updates.push(`date = $${idx++}`);
      params.push(date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id, cashbookId);
    const query = `UPDATE transactions SET ${updates.join(', ')} WHERE id = $${idx++} AND cashbook_id = $${idx}`;

    const result = await db.query(query, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    return res.json({ message: 'Transaction updated successfully', changes: result.rowCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
  const db = getDb();
  const { id, cashbookId } = req.params;

  try {
    const result = await db.query(
      `DELETE FROM transactions t
       USING cashbooks c
       WHERE t.id = $1 AND t.cashbook_id = $2 AND c.id = $3 AND c.user_id = $4`,
      [id, cashbookId, cashbookId, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    return res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Get balance for a cashbook
const getBalance = async (req, res) => {
  const db = getDb();
  const { cashbookId } = req.params;

  try {
    const ownership = await db.query('SELECT user_id FROM cashbooks WHERE id = $1', [cashbookId]);
    const cashbook = ownership.rows[0];
    if (!cashbook) {
      return res.status(404).json({ error: 'Cashbook not found' });
    }
    if (cashbook.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'inflow' THEN amount ELSE 0 END), 0) as totalInflow,
        COALESCE(SUM(CASE WHEN type = 'outflow' THEN amount ELSE 0 END), 0) as totalOutflow,
        COALESCE(SUM(CASE WHEN type = 'inflow' THEN amount ELSE -amount END), 0) as balance
       FROM transactions
       WHERE cashbook_id = $1`,
      [cashbookId]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Generate PDF report
const generateReport = async (req, res) => {
  const db = getDb();
  const { cashbookId } = req.params;
  const { startDate, endDate, type } = req.query || {};

  try {
    const cashbookResult = await db.query('SELECT name, user_id FROM cashbooks WHERE id = $1', [cashbookId]);
    const cashbook = cashbookResult.rows[0];
    if (!cashbook) {
      return res.status(404).json({ error: 'Cashbook not found' });
    }
    if (cashbook.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = 'SELECT * FROM transactions WHERE cashbook_id = $1';
    const params = [cashbookId];

    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND date <= $${params.length}`;
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const result = await db.query(query, params);
    const transactions = result.rows;

    const totalInflow = transactions
      .filter((t) => t.type === 'inflow')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalOutflow = transactions
      .filter((t) => t.type === 'outflow')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const balance = totalInflow - totalOutflow;

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${cashbook.name}-report.pdf`);

    doc.pipe(res);

    try {
      doc.save();
      doc.opacity(0.08);
      doc.fillColor('gray');
      doc.fontSize(60);
      doc.rotate(-25, { origin: [300, 300] });
      doc.text(cashbook.name, 70, 250, { width: 500, align: 'center' });
      doc.rotate(25, { origin: [300, 300] });
      doc.opacity(1);
      doc.restore();
    } catch (e) {
      // ignore watermark errors
    }

    doc.fontSize(20).text(cashbook.name, { align: 'center' });
    doc.fontSize(16).text('Cash Book Report', { align: 'center' });
    doc.moveDown();

    if (startDate || endDate) {
      doc.fontSize(12).text(
        `Period: ${startDate || 'Beginning'} to ${endDate || 'End'}`,
        { align: 'center' }
      );
    } else {
      doc.fontSize(12).text('Period: All Transactions', { align: 'center' });
    }
    doc.moveDown(2);

    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Total Inflow: Rs ${totalInflow.toFixed(2)}`);
    doc.text(`Total Outflow: Rs ${totalOutflow.toFixed(2)}`);
    doc.text(`Balance: Rs ${balance.toFixed(2)}`);
    doc.moveDown(2);

    doc.fontSize(14).text('Transactions', { underline: true });
    doc.moveDown();

    if (transactions.length === 0) {
      doc.fontSize(12).text('No transactions found for this period.');
    } else {
      doc.fontSize(10);
      doc.text('Date', 50, doc.y, { width: 80 });
      doc.text('Type', 130, doc.y, { width: 60 });
      doc.text('Amount', 190, doc.y, { width: 80 });
      doc.text('Description', 270, doc.y, { width: 250 });
      doc.moveDown();

      doc.moveTo(50, doc.y).lineTo(520, doc.y).stroke();
      doc.moveDown(0.5);

      transactions.forEach((t) => {
        doc.text(new Date(t.date).toLocaleDateString(), 50, doc.y, { width: 80 });
        doc.text(t.type === 'inflow' ? 'Inflow' : 'Outflow', 130, doc.y, { width: 60 });
        doc.text(`Rs ${Number(t.amount || 0).toFixed(2)}`, 190, doc.y, { width: 80 });
        doc.text(t.description || '-', 270, doc.y, { width: 250 });
        doc.moveDown();

        if (doc.y > 700) {
          doc.addPage();
        }
      });
    }

    doc.fontSize(10).text(
      `Generated on ${new Date().toLocaleString()}`,
      50,
      720,
      { align: 'center', width: 500 }
    );

    doc.end();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getBalance,
  generateReport
};
