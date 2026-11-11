const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const env = require('./config/env');

const authRoutes = require('./routes/authRoutes');
const cardRoutes = require('./routes/cardRoutes');
const transferRoutes = require('./routes/transferRoutes');
const adminRoutes = require('./routes/adminRoutes');

const { notFoundHandler, errorHandler } = require('./middleware/error');

const app = express();

// Security headers with Cross-Origin Resource Policy allowed for uploaded receipts
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Enable CORS with credentials for cookies and authorization headers
app.use(
  cors({
    origin: [env.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded receipts statically
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Titan NeoBank & Treasury Management Engine',
    version: '2.5.0-ENTERPRISE',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all 404 and Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

