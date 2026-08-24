const express = require('express');
const router = express.Router();
const config = require('../config');
const { requireAdmin } = require('../middleware/auth');

router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === config.ADMIN_USERNAME && password === config.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.render('admin/login', { error: 'Invalid username or password' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

router.get('/', requireAdmin, (req, res) => {
  res.render('admin/dashboard');
});

router.get('/menu', requireAdmin, (req, res) => {
  res.render('admin/menu');
});

router.get('/orders', requireAdmin, (req, res) => {
  res.render('admin/orders');
});

router.get('/billing', requireAdmin, (req, res) => {
  res.render('admin/billing', { tableId: req.query.tableId || null });
});

router.get('/billing/:tableId', requireAdmin, (req, res) => {
  res.render('admin/billing', { tableId: req.params.tableId });
});

router.get('/qr-codes', requireAdmin, (req, res) => {
  res.render('admin/qr-codes');
});

module.exports = router;
