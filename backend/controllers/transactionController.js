const { getDb } = require('../database/db');
const PDFDocument = require('pdfkit');

function decodeCategoryFromDescription(value) {
  const raw = value || '';
  const match = raw.match(/^\s*\[#([^\]]+)\]\s*(.*)$/);
  if (!match) return { category: '', description: raw };
  return { category: (match[1] || '').trim(), description: (match[2] || '').trim() };
}

function normalizeTransaction(row) {
  if (!row) return row;
  return {
    ...row,
    amount: Number(row.amount || 0),
  };
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
    return res.json(result.rows.map(normalizeTransaction));
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
    const row = normalizeTransaction(result.rows[0]);
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
    return res.status(201).json({
      id: row.id,
      cashbook_id: cashbookId,
      type,
      amount: Number(amount || 0),
      description,
      date,
    });
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
    const row = result.rows[0] || {};
    return res.json({
      totalInflow: Number(row.totalinflow ?? row.totalInflow ?? 0),
      totalOutflow: Number(row.totaloutflow ?? row.totalOutflow ?? 0),
      balance: Number(row.balance ?? 0),
    });
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

    const userResult = await db.query(
      'SELECT username, email, mobile FROM users WHERE id = $1',
      [cashbook.user_id]
    );
    const user = userResult.rows[0] || {};

    const invoiceNo = `INV-${cashbookId}-${Date.now().toString().slice(-6)}`;
    const issueDate = new Date().toLocaleDateString();
    const periodLabel = startDate || endDate
      ? `${startDate || 'Beginning'} to ${endDate || 'End'}`
      : 'All Transactions';

    const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
    const normalizeText = (value) => String(value || '')
      .replace(EMOJI_REGEX, '')
      .replace(/\s+/g, ' ')
      .trim();

    const splitDescription = (desc) => {
      const raw = String(desc || '');
      const match = raw.match(/^\s*\[#([^\]]+)\]\s*(.*)$/);
      const category = match ? match[1] : '';
      const text = match ? match[2] : raw;
      const cleanCategory = normalizeText(category);
      const cleanText = normalizeText(text);
      const combined = cleanCategory
        ? `${cleanCategory}${cleanText ? ' - ' + cleanText : ''}`
        : (cleanText || '-');
      return combined || '-';
    };

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftX = doc.page.margins.left;
    const rightX = leftX + pageWidth;

    doc.save();
    doc.rect(leftX, 40, pageWidth, 60).fill('#FFFFFF');
    doc.restore();

    doc.fontSize(18).fillColor('black').text(cashbook.name, leftX, 50, { align: 'left' });
    doc.fontSize(10).fillColor('#333333').text('Cash Book Report', leftX, 70);

    doc.fontSize(16).fillColor('black').text('INVOICE', rightX - 150, 50, { width: 150, align: 'right' });
    doc.fontSize(10).fillColor('#333333').text(`Invoice No: ${invoiceNo}`, rightX - 200, 70, { width: 200, align: 'right' });
    doc.fontSize(10).fillColor('#333333').text(`Date: ${issueDate}`, rightX - 200, 85, { width: 200, align: 'right' });

    doc.moveTo(leftX, 105).lineTo(rightX, 105).strokeColor('black').stroke();
    doc.strokeColor('black');

    doc.fontSize(11).fillColor('black').text('Bill To', leftX, 110);
    doc.fontSize(10).fillColor('#222222').text(`Name: ${normalizeText(user.username) || '-'}`, leftX, 128);
    doc.fontSize(10).fillColor('#222222').text(`Mobile: ${normalizeText(user.mobile) || '-'}`, leftX, 143);
    doc.fontSize(10).fillColor('#222222').text(`Email: ${normalizeText(user.email) || '-'}`, leftX, 158);

    doc.fontSize(11).fillColor('black').text('Report Period', rightX - 220, 110, { width: 220, align: 'right' });
    doc.fontSize(10).fillColor('#222222').text(periodLabel, rightX - 220, 128, { width: 220, align: 'right' });
    doc.fillColor('black');

    const tableTop = 200;
    const colWidths = [30, 80, 230, 70, 102];
    const colX = [leftX];
    for (let i = 0; i < colWidths.length - 1; i += 1) {
      colX.push(colX[i] + colWidths[i]);
    }

    const drawTableHeader = (y) => {
      doc.save();
      doc.rect(leftX, y - 2, pageWidth, 18).fill('#F2F2F2');
      doc.restore();

      doc.fontSize(10).fillColor('black');
      doc.text('S.No', colX[0], y, { width: colWidths[0] });
      doc.text('Date', colX[1], y, { width: colWidths[1] });
      doc.text('Description', colX[2], y, { width: colWidths[2] });
      doc.text('Type', colX[3], y, { width: colWidths[3] });
      doc.text('Amount', colX[4], y, { width: colWidths[4], align: 'right' });
      doc.moveTo(leftX, y + 15).lineTo(rightX, y + 15).strokeColor('black').stroke();
      doc.strokeColor('black');
    };

    drawTableHeader(tableTop);

    let y = tableTop + 22;
    if (transactions.length === 0) {
      doc.fontSize(10).fillColor('#6B7280').text('No transactions found for this period.', leftX, y);
      doc.fillColor('black');
      y += 20;
    } else {
      transactions.forEach((t, idx) => {
        if (y > 700) {
          doc.addPage();
          drawTableHeader(50);
          y = 72;
        }

        if (idx % 2 === 0) {
          doc.save();
          doc.rect(leftX, y - 2, pageWidth, 18).fill('#FFFFFF');
          doc.restore();
        }

        doc.fontSize(10).fillColor('black').text(String(idx + 1), colX[0], y, { width: colWidths[0] });
        doc.fillColor('#222222').text(new Date(t.date).toLocaleDateString(), colX[1], y, { width: colWidths[1] });
        doc.fillColor('#222222').text(splitDescription(t.description), colX[2], y, { width: colWidths[2] });

        const typeLabel = t.type === 'inflow' ? 'Inflow' : 'Outflow';
        doc.fillColor('#222222').text(typeLabel, colX[3], y, { width: colWidths[3] });

        doc.fillColor('black').text(`Rs ${Number(t.amount || 0).toFixed(2)}`, colX[4], y, { width: colWidths[4], align: 'right' });
        doc.fillColor('black');

        y += 18;
      });
    }

    const summaryTop = y + 10;
    const summaryX = rightX - 220;
    doc.save();
    doc.rect(summaryX, summaryTop - 4, 220, 60).fill('#F2F2F2');
    doc.restore();
    doc.moveTo(summaryX, summaryTop).lineTo(rightX, summaryTop).strokeColor('black').stroke();
    doc.strokeColor('black');
    doc.fontSize(10).fillColor('black').text(`Total Inflow: Rs ${totalInflow.toFixed(2)}`, summaryX, summaryTop + 8, { width: 220, align: 'right' });
    doc.fontSize(10).fillColor('black').text(`Total Outflow: Rs ${totalOutflow.toFixed(2)}`, summaryX, summaryTop + 24, { width: 220, align: 'right' });
    doc.fontSize(11).fillColor('black').text(`Net Balance: Rs ${balance.toFixed(2)}`, summaryX, summaryTop + 44, { width: 220, align: 'right' });
    doc.fillColor('black');

    doc.fontSize(9).fillColor('#4B4B4B').text(
      `Generated on ${new Date().toLocaleString()}`,
      leftX,
      720,
      { width: pageWidth, align: 'center' }
    );
    doc.fillColor('black');

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
