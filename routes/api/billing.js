const express = require('express');
const router = express.Router();
const db = require('../../db/database');
const { requireAdminAPI } = require('../../middleware/auth');
const { calculateBill } = require('../../utils/bill-calculator');
const config = require('../../config');
const sse = require('../sse');

router.get('/:tableId', (req, res) => {
  try {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.tableId);
    if (!table || !table.session_id) {
      return res.status(404).json({ error: 'No active session for this table' });
    }

    const orderItems = db.prepare(`
      SELECT oi.* 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.table_id = ? AND o.session_id = ? AND o.status != 'cancelled'
    `).all(table.id, table.session_id);

    const bill = db.prepare('SELECT * FROM bills WHERE table_id = ? AND session_id = ?').get(table.id, table.session_id);
    
    const currentCalculation = calculateBill(orderItems, bill ? bill.discount_percent : 0, config.TAX_RATE);

    res.json({ table, items: orderItems, existing_bill: bill, calculation: currentCalculation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:tableId/generate', requireAdminAPI, (req, res) => {
  try {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.tableId);
    if (!table || !table.session_id) return res.status(404).json({ error: 'No active session' });

    const orderItems = db.prepare(`
      SELECT oi.* 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.table_id = ? AND o.session_id = ? AND o.status != 'cancelled'
    `).all(table.id, table.session_id);

    const calc = calculateBill(orderItems, 0, config.TAX_RATE);
    
    let existingBill = db.prepare('SELECT * FROM bills WHERE table_id = ? AND session_id = ?').get(table.id, table.session_id);

    if (existingBill) {
      db.prepare(`
        UPDATE bills SET 
          subtotal = ?, tax_percent = ?, tax_amount = ?, total = ?
        WHERE id = ?
      `).run(calc.subtotal, config.TAX_RATE, calc.taxAmount, calc.total, existingBill.id);
    } else {
      const info = db.prepare(`
        INSERT INTO bills (table_id, session_id, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total)
        VALUES (?, ?, ?, 0, 0, ?, ?, ?)
      `).run(table.id, table.session_id, calc.subtotal, config.TAX_RATE, calc.taxAmount, calc.total);
      existingBill = { id: info.lastInsertRowid };
    }

    res.json({ success: true, billId: existingBill.id, calculation: calc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:tableId/pay', requireAdminAPI, (req, res) => {
  try {
    const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(req.params.tableId);
    if (!table || !table.session_id) return res.status(404).json({ error: 'No active session' });

    db.transaction(() => {
      db.prepare(`UPDATE bills SET status = ?, paid_at = datetime('now') WHERE table_id = ? AND session_id = ?`)
        .run('paid', table.id, table.session_id);
      db.prepare(`UPDATE tables SET status = ?, session_id = NULL, updated_at = datetime('now') WHERE id = ?`)
        .run('empty', table.id);
    })();
    
    sse.broadcast('table_update', { table_id: table.id, status: 'empty' });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:billId/discount', requireAdminAPI, (req, res) => {
  try {
    const { discount_percent } = req.body;
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const orderItems = db.prepare(`
      SELECT oi.* 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.table_id = ? AND o.session_id = ? AND o.status != 'cancelled'
    `).all(bill.table_id, bill.session_id);

    const calc = calculateBill(orderItems, discount_percent || 0, bill.tax_percent);

    db.prepare(`
      UPDATE bills SET 
        subtotal = ?, discount_percent = ?, discount_amount = ?, tax_amount = ?, total = ?
      WHERE id = ?
    `).run(calc.subtotal, discount_percent || 0, calc.discountAmount, calc.taxAmount, calc.total, req.params.billId);

    res.json({ success: true, calculation: calc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
