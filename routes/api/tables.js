const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requireAdminAPI } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const sse = require('../sse');

router.get('/', (req, res) => {
  try {
    const tables = db.prepare('SELECT * FROM tables ORDER BY table_number').all();
    
    // Add running stats for occupied tables
    const result = tables.map(table => {
      if (table.status === 'occupied' && table.session_id) {
        const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders WHERE table_id = ? AND session_id = ? AND status != ?').get(table.id, table.session_id, 'cancelled');
        
        const items = db.prepare(`
          SELECT oi.price_at_order, oi.quantity 
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE o.table_id = ? AND o.session_id = ? AND o.status != ?
        `).all(table.id, table.session_id, 'cancelled');
        
        const runningTotal = items.reduce((sum, item) => sum + (item.price_at_order * item.quantity), 0);
        
        return { ...table, active_orders: orderCount.count, running_total: runningTotal };
      }
      return table;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    let orders = [];
    if (table.session_id) {
      orders = db.prepare('SELECT * FROM orders WHERE table_id = ? AND session_id = ?').all(table.id, table.session_id);
      
      orders.forEach(order => {
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      });
    }

    res.json({ table, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/status', requireAdminAPI, (req, res) => {
  try {
    const { status } = req.body;
    let query = `UPDATE tables SET status = ?, updated_at = datetime('now') WHERE id = ?`;
    let params = [status, req.params.id];

    if (status === 'empty') {
      query = `UPDATE tables SET status = ?, session_id = NULL, updated_at = datetime('now') WHERE id = ?`;
    }

    db.prepare(query).run(...params);
    sse.broadcast('table_update', { table_id: req.params.id, status });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/open', (req, res) => {
  try {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    if (table.status === 'occupied' && table.session_id) {
      return res.json({ session_id: table.session_id, status: table.status });
    }

    const sessionId = uuidv4();
    db.prepare(`UPDATE tables SET status = ?, session_id = ?, updated_at = datetime('now') WHERE id = ?`)
      .run('occupied', sessionId, req.params.id);

    sse.broadcast('table_update', { table_id: req.params.id, status: 'occupied' });
    res.json({ session_id: sessionId, status: 'occupied' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
