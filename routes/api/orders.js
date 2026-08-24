const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requireAdminAPI } = require('../../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const sse = require('../sse');

router.post('/', (req, res) => {
  try {
    const { table_id, items, customer_note } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain items' });
    }

    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(table_id);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    let session_id = table.session_id;

    const transaction = db.transaction(() => {
      if (table.status === 'empty' || !session_id) {
        session_id = uuidv4();
        db.prepare(`UPDATE tables SET status = ?, session_id = ?, updated_at = datetime('now') WHERE id = ?`)
          .run('occupied', session_id, table_id);
      } else if (table.status === 'needs_attention') {
        db.prepare(`UPDATE tables SET status = ?, updated_at = datetime('now') WHERE id = ?`)
          .run('occupied', table_id);
      }

      const orderInfo = db.prepare('INSERT INTO orders (table_id, session_id, customer_note) VALUES (?, ?, ?)')
        .run(table_id, session_id, customer_note || '');

      const orderId = orderInfo.lastInsertRowid;
      const insertItem = db.prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, notes, item_name) VALUES (?, ?, ?, ?, ?, ?)');
      
      const getMenuItem = db.prepare('SELECT name, price FROM menu_items WHERE id = ?');
      
      for (const item of items) {
        const menuItem = getMenuItem.get(item.menu_item_id);
        if (menuItem) {
          insertItem.run(orderId, item.menu_item_id, item.quantity, menuItem.price, item.notes || '', menuItem.name);
        }
      }
      return orderId;
    });

    const newOrderId = transaction();

    // Fetch complete order to broadcast
    const newOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(newOrderId);
    newOrder.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(newOrderId);
    newOrder.table_number = db.prepare('SELECT table_number FROM tables WHERE id = ?').get(table_id).table_number;

    sse.broadcast('new_order', newOrder);
    sse.broadcast('table_update', { table_id, status: 'occupied' });

    res.json(newOrder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', (req, res) => {
  try {
    const { table_id, session_id, status } = req.query;
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (table_id) { query += ' AND table_id = ?'; params.push(table_id); }
    if (session_id) { query += ' AND session_id = ?'; params.push(session_id); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    
    query += ' ORDER BY created_at DESC';

    const orders = db.prepare(query).all(...params);
    orders.forEach(order => {
      order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/active', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT o.*, t.table_number 
      FROM orders o
      JOIN tables t ON o.table_id = t.id
      WHERE o.status IN ('pending', 'confirmed', 'preparing')
      ORDER BY o.created_at ASC
    `).all();
    
    orders.forEach(order => {
      order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/status', requireAdminAPI, (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    sse.broadcast('order_status', { order_id: req.params.id, status, table_id: order.table_id });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
