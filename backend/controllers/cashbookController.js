const { getDb } = require('../database/db');

// Get all cashbooks for a user
const getUserCashbooks = async (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  try {
    const result = await db.query(
      'SELECT * FROM cashbooks WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Get single cashbook
const getCashbookById = async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await db.query('SELECT * FROM cashbooks WHERE id = $1 AND user_id = $2', [id, userId]);
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Cashbook not found' });
    }
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Create new cashbook
const createCashbook = async (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  const { name, description } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'Cashbook name is required' });
  }

  try {
    const result = await db.query(
      'INSERT INTO cashbooks (user_id, name, description) VALUES ($1, $2, $3) RETURNING id',
      [userId, name, description || null]
    );
    const row = result.rows[0];
    return res.status(201).json({
      id: row.id,
      user_id: userId,
      name,
      description,
      message: 'Cashbook created successfully'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Update cashbook
const updateCashbook = async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const userId = req.user.id;
  const { name, description } = req.body || {};

  const updates = [];
  const params = [];
  let idx = 1;

  if (name) {
    updates.push(`name = $${idx++}`);
    params.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${idx++}`);
    params.push(description);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id, userId);
  const query = `UPDATE cashbooks SET ${updates.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`;

  try {
    const result = await db.query(query, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cashbook not found' });
    }
    return res.json({ message: 'Cashbook updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// Delete cashbook
const deleteCashbook = async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await db.query('DELETE FROM cashbooks WHERE id = $1 AND user_id = $2', [id, userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cashbook not found' });
    }
    return res.json({ message: 'Cashbook deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getUserCashbooks,
  getCashbookById,
  createCashbook,
  updateCashbook,
  deleteCashbook
};





