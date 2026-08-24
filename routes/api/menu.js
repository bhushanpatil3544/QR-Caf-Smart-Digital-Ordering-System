const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requireAdminAPI } = require('../../middleware/auth');

// Get full menu
router.get('/', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
    const items = db.prepare(`
      SELECT m.*, c.name as category_name
      FROM menu_items m
      LEFT JOIN categories c ON m.category_id = c.id
    `).all();
    res.json({ categories, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Categories CRUD
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order').all();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', requireAdminAPI, (req, res) => {
  try {
    const { name, sort_order } = req.body;
    const stmt = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
    const info = stmt.run(name, sort_order || 0);
    res.json({ id: info.lastInsertRowid, name, sort_order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/categories/:id', requireAdminAPI, (req, res) => {
  try {
    const { name, sort_order } = req.body;
    const stmt = db.prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?');
    stmt.run(name, sort_order || 0, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/categories/:id', requireAdminAPI, (req, res) => {
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?').get(req.params.id);
    if (count.count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with existing menu items.' });
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Menu Items CRUD
router.post('/', requireAdminAPI, (req, res) => {
  try {
    const { name, description, price, category_id, image_url, available } = req.body;
    const stmt = db.prepare(`
      INSERT INTO menu_items (name, description, price, category_id, image_url, available)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, description || '', price, category_id, image_url || '', available !== undefined ? available : 1);
    res.json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireAdminAPI, (req, res) => {
  try {
    const { name, description, price, category_id, image_url, available } = req.body;
    const stmt = db.prepare(`
      UPDATE menu_items 
      SET name = ?, description = ?, price = ?, category_id = ?, image_url = ?, available = ?
      WHERE id = ?
    `);
    stmt.run(name, description || '', price, category_id, image_url || '', available !== undefined ? available : 1, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAdminAPI, (req, res) => {
  try {
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/toggle', requireAdminAPI, (req, res) => {
  try {
    const item = db.prepare('SELECT available FROM menu_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    
    const newStatus = item.available ? 0 : 1;
    db.prepare('UPDATE menu_items SET available = ? WHERE id = ?').run(newStatus, req.params.id);
    res.json({ success: true, available: newStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
