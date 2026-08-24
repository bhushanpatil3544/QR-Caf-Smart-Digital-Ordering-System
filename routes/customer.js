const express = require('express');
const router = express.Router();
const db = require('../db/database');
const config = require('../config');

router.get('/:tableNumber', (req, res) => {
  const tableNum = parseInt(req.params.tableNumber, 10);
  
  if (isNaN(tableNum) || tableNum < 1 || tableNum > config.TOTAL_TABLES) {
    return res.status(404).render('customer/error', { message: 'Invalid Table Number' });
  }

  try {
    const table = db.prepare('SELECT * FROM tables WHERE table_number = ?').get(tableNum);
    if (!table) {
      return res.status(404).render('customer/error', { message: 'Table not found in database' });
    }
    
    res.render('customer/order', { 
      tableNumber: tableNum, 
      tableId: table.id,
      sessionId: table.session_id
    });
  } catch (error) {
    res.status(500).render('customer/error', { message: 'Server error' });
  }
});

module.exports = router;
