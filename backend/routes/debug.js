const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

router.get('/tables', async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query('SELECT * FROM users');
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/cashbooks', async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query('SELECT * FROM cashbooks');
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/transactions', async (req, res) => {
  const db = getDb();
  try {
    const result = await db.query('SELECT * FROM transactions');
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;