const { getDb } = require('./db');

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function initDB() {
  const db = getDb();
  try {
    await run(
      db,
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        mobile TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        profile_image TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`
    );

    await run(
      db,
      `CREATE TABLE IF NOT EXISTS cashbooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    );

    await run(
      db,
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cashbook_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('inflow', 'outflow')),
        amount REAL NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cashbook_id) REFERENCES cashbooks(id) ON DELETE CASCADE
      )`
    );

    console.log('✅ SQLite tables ready');
  } catch (err) {
    console.error('❌ DB init error:', err);
  }
}

module.exports = initDB;
