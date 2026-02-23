const { getDb } = require('../database/db');
const PDFDocument = require('pdfkit');

function decodeCategoryFromDescription(value) {
  const raw = value || '';
  const match = raw.match(/^\s*\[#([^\]]+)\]\s*(.*)$/);
  if (!match) return { category: '', description: raw };
  return { category: (match[1] || '').trim(), description: (match[2] || '').trim() };
}

// Get all transactions for a cashbook
const getAllTransactions = (req, res) => {
  const db = getDb();
  const { cashbookId } = req.params;
  const { type, startDate, endDate, sortBy = 'date', sortOrder = 'DESC' } = req.query;
  
  // Validate cashbook ownership
  db.get('SELECT user_id FROM cashbooks WHERE id = ?', [cashbookId], (err, cashbook) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!cashbook) {
      return res.status(404).json({ error: 'Cashbook not found' });
    }
    if (cashbook.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = 'SELECT * FROM transactions WHERE cashbook_id = ?';
    const params = [cashbookId];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    // Sorting
    const validSortFields = { date: 'date', amount: 'amount', description: 'description', type: 'type' };
    const sortField = validSortFields[sortBy] || 'date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${order}, created_at DESC`;
    
    db.all(query, params, (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    });
  });
};

// Get single transaction
const getTransactionById = (req, res) => {
  const db = getDb();
  const { id, cashbookId } = req.params;
  
  db.get(`
    SELECT t.* FROM transactions t
    INNER JOIN cashbooks c ON t.cashbook_id = c.id
    WHERE t.id = ? AND t.cashbook_id = ? AND c.user_id = ?
  `, [id, cashbookId, req.user.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.json(row);
  });
};

// Create new transaction
const createTransaction = (req, res) => {
  const db = getDb();
  const { cashbookId } = req.params;
  const { type, amount, description, date } = req.body;
  
  // Validation
  if (!type || !amount || !date) {
    res.status(400).json({ error: 'Type, amount, and date are required' });
    return;
  }
  
  if (type !== 'inflow' && type !== 'outflow') {
    res.status(400).json({ error: 'Type must be either "inflow" or "outflow"' });
    return;
  }
  
  if (amount <= 0) {
    res.status(400).json({ error: 'Amount must be greater than 0' });
    return;
  }

  // Validate cashbook ownership
  db.get('SELECT user_id FROM cashbooks WHERE id = ?', [cashbookId], (err, cashbook) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!cashbook) {
      return res.status(404).json({ error: 'Cashbook not found' });
    }
    if (cashbook.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const query = 'INSERT INTO transactions (cashbook_id, type, amount, description, date) VALUES (?, ?, ?, ?, ?)';
    
    db.run(query, [cashbookId, type, amount, description || null, date], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, cashbook_id: cashbookId, type, amount, description, date });
    });
  });
};

// Update transaction
const updateTransaction = (req, res) => {
  const db = getDb();
  const { id, cashbookId } = req.params;
  const { type, amount, description, date } = req.body;
  
  // Validation
  if (type && type !== 'inflow' && type !== 'outflow') {
    res.status(400).json({ error: 'Type must be either "inflow" or "outflow"' });
    return;
  }
  
  if (amount !== undefined && amount <= 0) {
    res.status(400).json({ error: 'Amount must be greater than 0' });
    return;
  }

  // Validate ownership
  db.get(`
    SELECT t.* FROM transactions t
    INNER JOIN cashbooks c ON t.cashbook_id = c.id
    WHERE t.id = ? AND t.cashbook_id = ? AND c.user_id = ?
  `, [id, cashbookId, req.user.id], (err, transaction) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updates = [];
    const params = [];
    
    if (type) {
      updates.push('type = ?');
      params.push(type);
    }
    if (amount !== undefined) {
      updates.push('amount = ?');
      params.push(amount);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (date) {
      updates.push('date = ?');
      params.push(date);
    }
    
    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }
    
    params.push(id, cashbookId);
    const query = `UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND cashbook_id = ?`;
    
    db.run(query, params, function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }
      res.json({ message: 'Transaction updated successfully', changes: this.changes });
    });
  });
};

// Delete transaction
const deleteTransaction = (req, res) => {
  const db = getDb();
  const { id, cashbookId } = req.params;
  
  db.run(`
    DELETE FROM transactions 
    WHERE id = ? AND cashbook_id = ? 
    AND EXISTS (
      SELECT 1 FROM cashbooks 
      WHERE id = ? AND user_id = ?
    )
  `, [id, cashbookId, cashbookId, req.user.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.json({ message: 'Transaction deleted successfully' });
  });
};

// Get balance for a cashbook
const getBalance = (req, res) => {
  const db = getDb();
  const { cashbookId } = req.params;
  
  // Validate ownership
  db.get('SELECT user_id FROM cashbooks WHERE id = ?', [cashbookId], (err, cashbook) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!cashbook) {
      return res.status(404).json({ error: 'Cashbook not found' });
    }
    if (cashbook.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    db.get(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'inflow' THEN amount ELSE 0 END), 0) as totalInflow,
        COALESCE(SUM(CASE WHEN type = 'outflow' THEN amount ELSE 0 END), 0) as totalOutflow,
        COALESCE(SUM(CASE WHEN type = 'inflow' THEN amount ELSE -amount END), 0) as balance
      FROM transactions
      WHERE cashbook_id = ?
    `, [cashbookId], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(row);
    });
  });
};

// Generate PDF report
const generateReport = (req, res) => {
  const db = getDb();
  const { cashbookId } = req.params;
  const { startDate, endDate, type } = req.query;
  
  // Validate ownership
  db.get('SELECT name, user_id FROM cashbooks WHERE id = ?', [cashbookId], (err, cashbook) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!cashbook) {
      return res.status(404).json({ error: 'Cashbook not found' });
    }
    if (cashbook.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = 'SELECT * FROM transactions WHERE cashbook_id = ?';
    const params = [cashbookId];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY date DESC, created_at DESC';
    
    db.all(query, params, (err, transactions) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Calculate totals
      const totalInflow = transactions
        .filter(t => t.type === 'inflow')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalOutflow = transactions
        .filter(t => t.type === 'outflow')
        .reduce((sum, t) => sum + t.amount, 0);
      const balance = totalInflow - totalOutflow;
      
      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${cashbook.name}-report.pdf`);
      
      // Pipe PDF to response
      doc.pipe(res);

      // Watermark (cashbook name on background)
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
      
      // Title
      doc.fontSize(20).text(cashbook.name, { align: 'center' });
      doc.fontSize(16).text('Cash Book Report', { align: 'center' });
      doc.moveDown();
      
      // Date range
      if (startDate || endDate) {
        doc.fontSize(12).text(
          `Period: ${startDate || 'Beginning'} to ${endDate || 'End'}`,
          { align: 'center' }
        );
      } else {
        doc.fontSize(12).text('Period: All Transactions', { align: 'center' });
      }
      doc.moveDown(2);
      
      // Summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(12);
      doc.text(`Total Inflow: Rs ${totalInflow.toFixed(2)}`);
      doc.text(`Total Outflow: Rs ${totalOutflow.toFixed(2)}`);
      doc.text(`Balance: Rs ${balance.toFixed(2)}`);
      doc.moveDown(2);
      
      // Transactions table
      doc.fontSize(14).text('Transactions', { underline: true });
      doc.moveDown();
      
      if (transactions.length === 0) {
        doc.text('No transactions found for the selected period.');
      } else {
        // Table header
        const tableTop = doc.y;
        doc.fontSize(10);
        doc.text('Date', 50, tableTop);
        doc.text('Type', 130, tableTop);
        doc.text('Category', 210, tableTop);
        doc.text('Amount', 320, tableTop);
        doc.text('Description', 400, tableTop);
        
        // Draw line
        doc.moveTo(50, doc.y + 5)
           .lineTo(550, doc.y + 5)
           .stroke();
        
        let y = doc.y + 10;
        
        transactions.forEach((transaction) => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }

          const decoded = decodeCategoryFromDescription(transaction.description);
          
          doc.text(new Date(transaction.date).toLocaleDateString(), 50, y);
          doc.text(transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1), 130, y);
          doc.text(decoded.category || '-', 210, y, { width: 95 });
          doc.text(`Rs ${transaction.amount.toFixed(2)}`, 320, y);
          doc.text(decoded.description || '-', 400, y, { width: 150 });
          
          y += 20;
        });
      }
      
      // Finalize PDF
      doc.end();
    });
  });
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
