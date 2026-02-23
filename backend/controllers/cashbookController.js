const { getDb } = require('../database/db');

// Get all cashbooks for a user
const getUserCashbooks = (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  db.all(
    'SELECT * FROM cashbooks WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
};

// Get single cashbook
const getCashbookById = (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const userId = req.user.id;

  db.get(
    'SELECT * FROM cashbooks WHERE id = ? AND user_id = ?',
    [id, userId],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!row) {
        res.status(404).json({ error: 'Cashbook not found' });
        return;
      }
      res.json(row);
    }
  );
};

// Create new cashbook
const createCashbook = (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { name, description } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Cashbook name is required' });
    return;
  }

  db.run(
    'INSERT INTO cashbooks (user_id, name, description) VALUES (?, ?, ?)',
    [userId, name, description || null],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({
        id: this.lastID,
        user_id: userId,
        name,
        description,
        message: 'Cashbook created successfully'
      });
    }
  );
};

// Update cashbook
const updateCashbook = (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const userId = req.user.id;
  const { name, description } = req.body;

  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  params.push(id, userId);
  const query = `UPDATE cashbooks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;

  db.run(query, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Cashbook not found' });
      return;
    }
    res.json({ message: 'Cashbook updated successfully' });
  });
};

// Delete cashbook
const deleteCashbook = (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const userId = req.user.id;

  db.run(
    'DELETE FROM cashbooks WHERE id = ? AND user_id = ?',
    [id, userId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Cashbook not found' });
        return;
      }
      res.json({ message: 'Cashbook deleted successfully' });
    }
  );
};

module.exports = {
  getUserCashbooks,
  getCashbookById,
  createCashbook,
  updateCashbook,
  deleteCashbook
};





