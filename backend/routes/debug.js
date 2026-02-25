const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

// View all users
router.get('/users', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// View all cashbooks
router.get('/cashbooks', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM cashbooks', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// View all transactions
router.get('/transactions', (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM transactions', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;