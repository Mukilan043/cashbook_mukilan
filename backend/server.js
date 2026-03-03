const express = require('express');
require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

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
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://cashbook-mukilan.vercel.app",
    "https://cashbook-mukilan.onrender.com"
  ],
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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