const express = require('express');
const path = require('path');
const session = require('express-session');
const config = require('./config');
const db = require('./db/database');
const os = require('os');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 0, etag: false, lastModified: false }));
app.use('/qr-codes', express.static(path.join(__dirname, 'qr-codes')));
app.set('view cache', false);

// Disable browser caching in development
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using https
}));

// Mount Routes
app.use('/admin', require('./routes/admin'));
app.use('/order', require('./routes/customer'));
app.use('/api/menu', require('./routes/api/menu'));
app.use('/api/tables', require('./routes/api/tables'));
app.use('/api/orders', require('./routes/api/orders'));
app.use('/api/billing', require('./routes/api/billing'));
app.use('/api/sse', require('./routes/sse'));

// Root route redirect to admin
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Get local IP for network access
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const LOCAL_IP = getLocalIP();

app.listen(config.PORT, () => {
  console.log(`Cafe QR System running at http://localhost:${config.PORT}`);
  console.log(`Customer access: http://${LOCAL_IP}:${config.PORT}/order/TABLE_NUMBER`);
});
