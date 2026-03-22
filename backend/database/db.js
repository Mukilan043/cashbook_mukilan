const { Pool } = require('pg');

let pool;

function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 60000,
      max: 5,
    });

    pool.on('error', (err) => {
      console.error('Unexpected DB pool error:', err.message);
    });
  }
  return pool;
}

module.exports = { getDb };