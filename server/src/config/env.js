const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/neobank_db',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'titan_quantum_secret_access_key_9921_omega',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'titan_quantum_secret_refresh_key_3841_omega',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '1h',
    refreshMaxAgeMs: 3600000, // Strictly 1 hour in ms (60 * 60 * 1000)
  },
  adminSecretKey: process.env.ADMIN_SECRET_KEY || 'bankadmin6453',
  highValueThreshold: parseFloat(process.env.HIGH_VALUE_THRESHOLD) || 10000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

module.exports = env;

