const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend.env') });
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const initDbPath = path.join(__dirname, 'database', 'initDB.js');
if (!fs.existsSync(initDbPath)) {
  console.error(`❌ Missing initDB at ${initDbPath}. Make sure backend/database/initDB.js is committed.`);
  process.exit(1);
}
const initDB = require(initDbPath);
const transactionRoutes = require('./routes/transactions');
const authRoutes = require('./routes/auth');
const cashbookRoutes = require('./routes/cashbooks');
const assistantRoutes = require('./routes/assistant');
const debugRoutes = require('./routes/debug');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://cashbook-mukilan.vercel.app",
  "https://cashbook-mukilan.onrender.com"
];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(bodyParser.json({ limit: '6mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '6mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cashbooks', cashbookRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/debug', debugRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Cash Book API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
// Initialize DB before handling requests
// Initialize DB


// Start server


// Start server only after DB is ready
async function startServer() {
  try {
    await initDB();
    console.log("✅ PostgreSQL tables ready");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}


startServer();