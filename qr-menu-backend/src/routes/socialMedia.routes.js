const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');

// Get all social media links
router.get('/', async (req, res) => {
  try {
    const { is_active } = req.query;

    let query = 'SELECT * FROM social_media WHERE 1=1';
    const params = [];

    // Filter by is_active if provided
    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    // Add ordering
    query += ' ORDER BY display_order';

    const socialMediaLinks = await db.query(query, params);

    res.json({
      success: true,
      data: socialMediaLinks
    });
  } catch (error) {
    console.error('Get social media links error:', error);
    res.status(500).json({
      success: false,
      message: 'Sosyal medya bağlantıları alınamadı',
      error: error.message
    });
  }
});

// Get social media link by ID
router.get('/:id', async (req, res) => {
  try {
    const socialMediaId = req.params.id;

    const socialMedia = await db.getOne('SELECT * FROM social_media WHERE id = ?', [socialMediaId]);

    if (!socialMedia) {
      return res.status(404).json({
        success: false,
        message: 'Sosyal medya bağlantısı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: socialMedia
    });
  } catch (error) {
    console.error('Get social media link error:', error);
    res.status(500).json({
      success: false,
      message: 'Sosyal medya bağlantısı bilgileri alınamadı',
      error: error.message
    });
  }
});

// Create social media link (admin only)
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { platform, url, icon, display_order, is_active } = req.body;

    // Validate required fields
    if (!platform || !url) {
      return res.status(400).json({
        success: false,
        message: 'Platform ve URL gereklidir'
      });
    }

    // Insert social media link
    const result = await db.run(
      'INSERT INTO social_media (platform, url, icon, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
      [
        platform,
        url,
        icon || null,
        display_order || 0,
        is_active === 'false' || is_active === '0' ? 0 : 1
      ]
    );

    const socialMediaId = result.insertId;

    // Get created social media link
    const newSocialMedia = await db.getOne('SELECT * FROM social_media WHERE id = ?', [socialMediaId]);

    res.status(201).json({
      success: true,
      message: 'Sosyal medya bağlantısı başarıyla oluşturuldu',
      data: newSocialMedia
    });
  } catch (error) {
    console.error('Create social media link error:', error);
    res.status(500).json({
      success: false,
      message: 'Sosyal medya bağlantısı oluşturma başarısız oldu',
      error: error.message
    });
  }
});

// Update social media link (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const socialMediaId = req.params.id;
    const { platform, url, icon, display_order, is_active } = req.body;

    // Check if social media link exists
    const socialMedia = await db.getOne('SELECT * FROM social_media WHERE id = ?', [socialMediaId]);

    if (!socialMedia) {
      return res.status(404).json({
        success: false,
        message: 'Sosyal medya bağlantısı bulunamadı'
      });
    }

    // Start building the query and parameters
    let sql = 'UPDATE social_media SET ';
    const params = [];
    const updates = [];

    // Add fields if provided
    if (platform) {
      updates.push('platform = ?');
      params.push(platform);
    }

    if (url) {
      updates.push('url = ?');
      params.push(url);
    }

    if (icon !== undefined) {
      updates.push('icon = ?');
      params.push(icon || null);
    }

    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(parseInt(display_order) || 0);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active === 'false' || is_active === '0' ? 0 : 1);
    }

    // If no updates, return success
    if (updates.length === 0) {
      return res.json({
        success: true,
        message: 'Güncellenecek bilgi bulunamadı',
        data: socialMedia
      });
    }

    // Complete the SQL query
    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(socialMediaId);

    // Update social media link
    await db.run(sql, params);

    // Get updated social media link
    const updatedSocialMedia = await db.getOne('SELECT * FROM social_media WHERE id = ?', [socialMediaId]);

    res.json({
      success: true,
      message: 'Sosyal medya bağlantısı başarıyla güncellendi',
      data: updatedSocialMedia
    });
  } catch (error) {
    console.error('Update social media link error:', error);
    res.status(500).json({
      success: false,
      message: 'Sosyal medya bağlantısı güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Delete social media link (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const socialMediaId = req.params.id;

    // Check if social media link exists
    const socialMedia = await db.getOne('SELECT * FROM social_media WHERE id = ?', [socialMediaId]);

    if (!socialMedia) {
      return res.status(404).json({
        success: false,
        message: 'Sosyal medya bağlantısı bulunamadı'
      });
    }

    // Delete social media link
    await db.run('DELETE FROM social_media WHERE id = ?', [socialMediaId]);

    res.json({
      success: true,
      message: 'Sosyal medya bağlantısı başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete social media link error:', error);
    res.status(500).json({
      success: false,
      message: 'Sosyal medya bağlantısı silinirken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
