const { getDb } = require('./db');

async function initDB() {
  const db = await getDb();

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        mobile VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS cashbooks (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        cashbook_id INT NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('inflow', 'outflow')),
        amount NUMERIC(10,2) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cashbook_id) REFERENCES cashbooks(id) ON DELETE CASCADE
      )
    `);

    console.log("✅ PostgreSQL tables ready");
  } catch (err) {
    console.error("❌ PostgreSQL init error:", err);
    throw err;
  }
}

module.exports = initDB;