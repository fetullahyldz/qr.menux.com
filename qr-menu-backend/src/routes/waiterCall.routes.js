const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');

// Get all waiter calls - sadece admin/personel için
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, table_id } = req.query;

    let query = `
      SELECT wc.*, rt.table_number
      FROM waiter_calls wc
      JOIN restaurant_tables rt ON wc.table_id = rt.id
      WHERE 1=1
    `;
    const params = [];

    // Add filters if provided
    if (status) {
      query += ' AND wc.status = ?';
      params.push(status);
    }

    if (table_id) {
      query += ' AND wc.table_id = ?';
      params.push(table_id);
    }

    // Add ordering
    query += ' ORDER BY wc.created_at DESC';

    const waiterCalls = await db.query(query, params);

    res.json({
      success: true,
      data: waiterCalls
    });
  } catch (error) {
    console.error('Get waiter calls error:', error);
    res.status(500).json({
      success: false,
      message: 'Garson çağrıları alınamadı',
      error: error.message
    });
  }
});

// Get waiter call by ID - sadece admin/personel için
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const waiterCallId = req.params.id;

    const waiterCall = await db.getOne(`
      SELECT wc.*, rt.table_number
      FROM waiter_calls wc
      JOIN restaurant_tables rt ON wc.table_id = rt.id
      WHERE wc.id = ?
    `, [waiterCallId]);

    if (!waiterCall) {
      return res.status(404).json({
        success: false,
        message: 'Garson çağrısı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: waiterCall
    });
  } catch (error) {
    console.error('Get waiter call error:', error);
    res.status(500).json({
      success: false,
      message: 'Garson çağrısı bilgileri alınamadı',
      error: error.message
    });
  }
});

// Create waiter call - herkes için, authenticateToken olmadan
router.post('/', async (req, res) => {
  try {
    const { table_id } = req.body;

    // Validate required fields
    if (!table_id) {
      return res.status(400).json({
        success: false,
        message: 'Masa ID gereklidir'
      });
    }

    // Check if table exists
    const table = await db.getOne('SELECT * FROM restaurant_tables WHERE id = ?', [table_id]);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Masa bulunamadı'
      });
    }

    // Check if there is already an active waiter call for this table
    const activeCall = await db.getOne(
      'SELECT * FROM waiter_calls WHERE table_id = ? AND status IN (\'pending\', \'in_progress\')',
      [table_id]
    );

    if (activeCall) {
      return res.status(400).json({
        success: false,
        message: 'Bu masa için zaten aktif bir garson çağrısı var'
      });
    }

    // Insert waiter call
    const result = await db.run(
      'INSERT INTO waiter_calls (table_id, status) VALUES (?, ?)',
      [table_id, 'pending']
    );

    const waiterCallId = result.insertId;

    // Get created waiter call
    const newWaiterCall = await db.getOne(`
      SELECT wc.*, rt.table_number
      FROM waiter_calls wc
      JOIN restaurant_tables rt ON wc.table_id = rt.id
      WHERE wc.id = ?
    `, [waiterCallId]);

    res.status(201).json({
      success: true,
      message: 'Garson çağrısı başarıyla oluşturuldu',
      data: newWaiterCall
    });
  } catch (error) {
    console.error('Create waiter call error:', error);
    res.status(500).json({
      success: false,
      message: 'Garson çağrısı oluşturma başarısız oldu',
      error: error.message
    });
  }
});

// Update waiter call status - sadece admin/personel için
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const waiterCallId = req.params.id;
    const { status } = req.body;

    // Check if waiter call exists
    const waiterCall = await db.getOne('SELECT * FROM waiter_calls WHERE id = ?', [waiterCallId]);

    if (!waiterCall) {
      return res.status(404).json({
        success: false,
        message: 'Garson çağrısı bulunamadı'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz garson çağrısı durumu'
      });
    }

    // Update waiter call status
    await db.run(
      'UPDATE waiter_calls SET status = ? WHERE id = ?',
      [status, waiterCallId]
    );

    // Get updated waiter call
    const updatedWaiterCall = await db.getOne(`
      SELECT wc.*, rt.table_number
      FROM waiter_calls wc
      JOIN restaurant_tables rt ON wc.table_id = rt.id
      WHERE wc.id = ?
    `, [waiterCallId]);

    res.json({
      success: true,
      message: 'Garson çağrısı durumu başarıyla güncellendi',
      data: updatedWaiterCall
    });
  } catch (error) {
    console.error('Update waiter call status error:', error);
    res.status(500).json({
      success: false,
      message: 'Garson çağrısı durumu güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Delete waiter call - sadece admin/personel için
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const waiterCallId = req.params.id;

    // Check if waiter call exists
    const waiterCall = await db.getOne('SELECT * FROM waiter_calls WHERE id = ?', [waiterCallId]);

    if (!waiterCall) {
      return res.status(404).json({
        success: false,
        message: 'Garson çağrısı bulunamadı'
      });
    }

    // Delete waiter call
    await db.run('DELETE FROM waiter_calls WHERE id = ?', [waiterCallId]);

    res.json({
      success: true,
      message: 'Garson çağrısı başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete waiter call error:', error);
    res.status(500).json({
      success: false,
      message: 'Garson çağrısı silinirken bir hata oluştu',
      error: error.message
    });
  }
});

// Get active waiter calls count - sadece admin/personel için
router.get('/active/count', authenticateToken, async (req, res) => {
  try {
    const result = await db.getOne(
      'SELECT COUNT(*) as count FROM waiter_calls WHERE status IN (\'pending\', \'in_progress\')'
    );

    res.json({
      success: true,
      data: { count: result.count }
    });
  } catch (error) {
    console.error('Get active waiter calls count error:', error);
    res.status(500).json({
      success: false,
      message: 'Aktif garson çağrıları sayısı alınamadı',
      error: error.message
    });
  }
});

// Get recent waiter calls - sadece admin/personel için
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const waiterCalls = await db.query(`
      SELECT wc.*, rt.table_number
      FROM waiter_calls wc
      JOIN restaurant_tables rt ON wc.table_id = rt.id
      ORDER BY wc.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({
      success: true,
      data: waiterCalls
    });
  } catch (error) {
    console.error('Get recent waiter calls error:', error);
    res.status(500).json({
      success: false,
      message: 'Son garson çağrıları alınamadı',
      error: error.message
    });
  }
});

module.exports = router;
