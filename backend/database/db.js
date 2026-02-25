const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'cashbook.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      profile_image TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table ready');
    }
  });

  // Cashbooks table
  db.run(`
    CREATE TABLE IF NOT EXISTS cashbooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating cashbooks table:', err.message);
    } else {
      console.log('Cashbooks table ready');
    }
  });

  // Transactions table
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashbook_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('inflow', 'outflow')),
      amount REAL NOT NULL CHECK(amount > 0),
      description TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cashbook_id) REFERENCES cashbooks(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating transactions table:', err.message);
    } else {
      console.log('Transactions table ready');
      migrateTransactionsTable();
      migrateUsersTable();
    }
  });
}

function migrateUsersTable() {
  db.all('PRAGMA table_info(users)', (err, columns) => {
    if (err) {
      console.error('Error checking users table info:', err.message);
      return;
    }
    const hasProfileImage = columns.some(col => col.name === 'profile_image');
    if (!hasProfileImage) {
      db.run('ALTER TABLE users ADD COLUMN profile_image TEXT', (err) => {
        if (err) {
          console.error('Error adding profile_image column:', err.message);
        } else {
          console.log('Users table migrated: profile_image added');
        }
      });
    }
  });
}

function migrateTransactionsTable() {
  db.all('PRAGMA table_info(transactions)', (err, columns) => {
    if (err) {
      console.error('Error checking table info:', err.message);
      return;
    }

    const hasCashbookId = columns.some(col => col.name === 'cashbook_id');

    if (!hasCashbookId) {
      console.log('Migrating transactions table: adding cashbook_id column...');
      db.run('ALTER TABLE transactions ADD COLUMN cashbook_id INTEGER', (err) => {
        if (err) {
          console.error('Error adding cashbook_id column:', err.message);
          recreateTransactionsTable();
        } else {
          console.log('Successfully added cashbook_id column');
          db.run(`
            UPDATE transactions
            SET cashbook_id = (SELECT id FROM cashbooks LIMIT 1)
            WHERE cashbook_id IS NULL
          `, (err) => {
            if (err) {
              console.error('Error updating existing transactions:', err.message);
            }
          });
        }
      });
    }
  });
}

function recreateTransactionsTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashbook_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('inflow', 'outflow')),
      amount REAL NOT NULL CHECK(amount > 0),
      description TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cashbook_id) REFERENCES cashbooks(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating new transactions table:', err.message);
    } else {
      db.run(`
        INSERT INTO transactions_new (id, cashbook_id, type, amount, description, date, created_at)
        SELECT id,
               COALESCE(cashbook_id, (SELECT id FROM cashbooks LIMIT 1)),
               type, amount, description, date, created_at
        FROM transactions
      `, (err) => {
        if (err) {
          console.error('Error migrating data:', err.message);
        } else {
          db.run('DROP TABLE transactions', () => {
            db.run('ALTER TABLE transactions_new RENAME TO transactions', () => {
              console.log('Successfully recreated transactions table');
            });
          });
        }
      });
    }
  });
}

function getDb() {
  return db;
}

function closeDb() {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
  });
}

module.exports = { getDb, closeDb };