const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');

// =================================
// ADMIN/PERSONEL ROUTES (korumalı)
// =================================

// Get all feedback - sadece admin/personel için
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { table_id, start_date, end_date } = req.query;

    let query = `
      SELECT f.*, rt.table_number
      FROM feedback f
      LEFT JOIN restaurant_tables rt ON f.table_id = rt.id
      WHERE 1=1
    `;
    const params = [];

    // Add filters if provided
    if (table_id) {
      query += ' AND f.table_id = ?';
      params.push(table_id);
    }

    if (start_date) {
      query += ' AND DATE(f.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(f.created_at) <= ?';
      params.push(end_date);
    }

    // Add ordering
    query += ' ORDER BY f.created_at DESC';

    const feedbacks = await db.query(query, params);

    res.json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    console.error('Get feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Geri bildirimler alınamadı',
      error: error.message
    });
  }
});

// Get feedback by ID - sadece admin/personel için
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const feedbackId = req.params.id;

    const feedback = await db.getOne(`
      SELECT f.*, rt.table_number
      FROM feedback f
      LEFT JOIN restaurant_tables rt ON f.table_id = rt.id
      WHERE f.id = ?
    `, [feedbackId]);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Geri bildirim bulunamadı'
      });
    }

    res.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Geri bildirim bilgileri alınamadı',
      error: error.message
    });
  }
});

// Delete feedback - sadece admin/personel için
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const feedbackId = req.params.id;

    // Check if feedback exists
    const feedback = await db.getOne('SELECT * FROM feedback WHERE id = ?', [feedbackId]);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Geri bildirim bulunamadı'
      });
    }

    // Delete feedback
    await db.run('DELETE FROM feedback WHERE id = ?', [feedbackId]);

    res.json({
      success: true,
      message: 'Geri bildirim başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Geri bildirim silinirken bir hata oluştu',
      error: error.message
    });
  }
});

// =================================
// MÜŞTERİ ROUTES (koruma yok)
// =================================

// Create feedback - müşteriler için, login gerektirmez
router.post('/', async (req, res) => {
  try {
    const {
      table_id,
      name,
      email,
      food_rating,
      service_rating,
      ambience_rating,
      price_rating,
      overall_rating,
      comments
    } = req.body;

    // Validate required fields
    if (!name || !overall_rating) {
      return res.status(400).json({
        success: false,
        message: 'Ad ve genel değerlendirme puanı gereklidir'
      });
    }

    // Validate ratings
    const ratings = [
      food_rating,
      service_rating,
      ambience_rating,
      price_rating,
      overall_rating
    ].filter(rating => rating !== undefined);

    for (const rating of ratings) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Değerlendirme puanları 1-5 arasında olmalıdır'
        });
      }
    }

    // If table_id provided, check if table exists
    if (table_id) {
      const table = await db.getOne('SELECT id FROM restaurant_tables WHERE id = ?', [table_id]);
      if (!table) {
        return res.status(404).json({
          success: false,
          message: 'Masa bulunamadı'
        });
      }
    }

    // Insert feedback
    const result = await db.run(
      `INSERT INTO feedback (
        table_id, name, email, food_rating, service_rating,
        ambience_rating, price_rating, overall_rating, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        table_id || null,
        name,
        email || null,
        food_rating || null,
        service_rating || null,
        ambience_rating || null,
        price_rating || null,
        overall_rating,
        comments || null
      ]
    );

    const feedbackId = result.insertId;

    // Get created feedback
    const newFeedback = await db.getOne(`
      SELECT f.*, rt.table_number
      FROM feedback f
      LEFT JOIN restaurant_tables rt ON f.table_id = rt.id
      WHERE f.id = ?
    `, [feedbackId]);

    res.status(201).json({
      success: true,
      message: 'Geri bildirim başarıyla gönderildi',
      data: newFeedback
    });
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Geri bildirim gönderilirken bir hata oluştu',
      error: error.message
    });
  }
});

// Get feedback statistics
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    } else if (start_date) {
      dateFilter = 'WHERE DATE(created_at) >= ?';
      params.push(start_date);
    } else if (end_date) {
      dateFilter = 'WHERE DATE(created_at) <= ?';
      params.push(end_date);
    }

    // Get counts and average ratings
    const statistics = await db.getOne(`
      SELECT
        COUNT(*) as total_count,
        ROUND(AVG(overall_rating), 1) as avg_overall_rating,
        ROUND(AVG(food_rating), 1) as avg_food_rating,
        ROUND(AVG(service_rating), 1) as avg_service_rating,
        ROUND(AVG(ambience_rating), 1) as avg_ambience_rating,
        ROUND(AVG(price_rating), 1) as avg_price_rating
      FROM feedback
      ${dateFilter}
    `, params);

    // Get rating distribution
    const ratingDistribution = await db.query(`
      SELECT
        overall_rating as rating,
        COUNT(*) as count
      FROM feedback
      ${dateFilter}
      GROUP BY overall_rating
      ORDER BY overall_rating
    `, params);

    // Get recent feedback
    const recentFeedback = await db.query(`
      SELECT f.*, rt.table_number
      FROM feedback f
      LEFT JOIN restaurant_tables rt ON f.table_id = rt.id
      ${dateFilter ? dateFilter : 'WHERE 1=1'}
      ORDER BY f.created_at DESC
      LIMIT 5
    `, params);

    res.json({
      success: true,
      data: {
        statistics,
        ratingDistribution,
        recentFeedback
      }
    });
  } catch (error) {
    console.error('Get feedback statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Geri bildirim istatistikleri alınamadı',
      error: error.message
    });
  }
});

// Get recent feedback
router.get('/recent', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const feedbacks = await db.query(`
      SELECT f.*, rt.table_number
      FROM feedback f
      LEFT JOIN restaurant_tables rt ON f.table_id = rt.id
      ORDER BY f.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    console.error('Get recent feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Son geri bildirimler alınamadı',
      error: error.message
    });
  }
});

module.exports = router;
