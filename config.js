const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_PATH: path.join(__dirname, 'db', 'cafe.db'),
  TAX_RATE: 5,
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'admin123',
  SESSION_SECRET: 'cafe-qr-secret-2024',
  TOTAL_TABLES: 18
};
