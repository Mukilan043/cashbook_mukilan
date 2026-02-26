const pool = require("./db");

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        mobile VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cashbooks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cashbook_id INT NOT NULL,
        type ENUM('inflow','outflow') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cashbook_id) REFERENCES cashbooks(id) ON DELETE CASCADE
      )
    `);

    console.log("✅ MySQL tables ready");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

module.exports = initDB;