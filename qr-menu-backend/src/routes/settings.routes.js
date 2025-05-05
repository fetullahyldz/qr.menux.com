const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Upload Directory Configuration
const uploadDir = path.join(__dirname, '../../public/uploads');

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'setting-' + req.params.key + '-' + uniqueSuffix + ext);
  }
});

// Filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
  }
};

// Create upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  }
});

// Get public settings
router.get('/', async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM site_settings WHERE is_public = 1');

    // Convert array of settings to object with key-value pairs
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {});

    res.json({
      success: true,
      data: settingsObject
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayarlar alınamadı',
      error: error.message
    });
  }
});

// Get single setting
router.get('/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const setting = await db.getOne('SELECT * FROM site_settings WHERE setting_key = ?', [key]);

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Ayar bulunamadı'
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayar alınamadı',
      error: error.message
    });
  }
});

// Add file upload endpoint for settings
router.post('/upload/:key', authenticateToken, authorizeRoles('admin', 'manager'), upload.single('file'), async (req, res) => {
  try {
    const key = req.params.key;
    console.log(`File upload request received for setting: ${key}`);
    console.log('Request headers:', req.headers);
    console.log('Request body keys:', Object.keys(req.body));

    if (!req.file) {
      console.error('No file provided for upload');
      return res.status(400).json({
        success: false,
        message: 'Yüklenecek dosya bulunamadı'
      });
    }

    console.log('Uploaded file details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename,
      path: req.file.path,
      destination: req.file.destination
    });

    // Check if file exists in the filesystem
    const filePath = req.file.path;
    try {
      fs.accessSync(filePath, fs.constants.F_OK);
      console.log(`File exists on disk: ${filePath}`);
    } catch (fileError) {
      console.error(`File does not exist on disk: ${filePath}`, fileError);
    }

    // Create file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    console.log(`File uploaded successfully, URL: ${fileUrl}`);

    // Check if setting exists
    const setting = await db.getOne('SELECT * FROM site_settings WHERE setting_key = ?', [key]);

    if (setting) {
      // If setting exists, update it
      await db.run(
        'UPDATE site_settings SET setting_value = ?, setting_type = ? WHERE setting_key = ?',
        [fileUrl, 'image', key]
      );
    } else {
      // If setting doesn't exist, create it
      await db.run(
        'INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public) VALUES (?, ?, ?, ?)',
        [key, fileUrl, 'image', 1]
      );
    }

    // Get updated setting
    const updatedSetting = await db.getOne('SELECT * FROM site_settings WHERE setting_key = ?', [key]);

    res.json({
      success: true,
      message: 'Dosya başarıyla yüklendi',
      data: {
        file_url: fileUrl,
        value: fileUrl,
        setting: updatedSetting
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Dosya yüklenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Update setting (admin only)
router.put('/:key', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const key = req.params.key;
    const { value, type, is_public } = req.body;

    // Check if setting exists
    const setting = await db.getOne('SELECT * FROM site_settings WHERE setting_key = ?', [key]);

    if (!setting) {
      // If setting doesn't exist, create it
      const result = await db.run(
        'INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public) VALUES (?, ?, ?, ?)',
        [key, value, type || 'text', is_public !== undefined ? is_public : 1]
      );

      const newSetting = await db.getOne('SELECT * FROM site_settings WHERE id = ?', [result.insertId]);

      return res.status(201).json({
        success: true,
        message: 'Ayar başarıyla oluşturuldu',
        data: newSetting
      });
    }

    // Start building the query and parameters
    let sql = 'UPDATE site_settings SET ';
    const params = [];
    const updates = [];

    // Add value if provided
    if (value !== undefined) {
      updates.push('setting_value = ?');
      params.push(value);
    }

    // Add type if provided
    if (type) {
      updates.push('setting_type = ?');
      params.push(type);
    }

    // Add is_public if provided
    if (is_public !== undefined) {
      updates.push('is_public = ?');
      params.push(is_public ? 1 : 0);
    }

    // If no updates, return success
    if (updates.length === 0) {
      return res.json({
        success: true,
        message: 'Güncellenecek bilgi bulunamadı',
        data: setting
      });
    }

    // Complete the SQL query
    sql += updates.join(', ') + ' WHERE setting_key = ?';
    params.push(key);

    // Update setting
    await db.run(sql, params);

    // Get updated setting
    const updatedSetting = await db.getOne('SELECT * FROM site_settings WHERE setting_key = ?', [key]);

    res.json({
      success: true,
      message: 'Ayar başarıyla güncellendi',
      data: updatedSetting
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayar güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Create setting (admin only)
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { key, value, type, is_public } = req.body;

    // Validate key
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Ayar anahtarı gereklidir'
      });
    }

    // Check if key already exists
    const existingSetting = await db.getOne('SELECT id FROM site_settings WHERE setting_key = ?', [key]);

    if (existingSetting) {
      return res.status(400).json({
        success: false,
        message: 'Bu ayar anahtarı zaten kullanımda'
      });
    }

    // Insert setting
    const result = await db.run(
      'INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public) VALUES (?, ?, ?, ?)',
      [key, value || '', type || 'text', is_public !== undefined ? (is_public ? 1 : 0) : 1]
    );

    const newSetting = await db.getOne('SELECT * FROM site_settings WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Ayar başarıyla oluşturuldu',
      data: newSetting
    });
  } catch (error) {
    console.error('Create setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayar oluşturma başarısız oldu',
      error: error.message
    });
  }
});

// Delete setting (admin only)
router.delete('/:key', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const key = req.params.key;

    // Check if setting exists
    const setting = await db.getOne('SELECT * FROM site_settings WHERE setting_key = ?', [key]);

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Ayar bulunamadı'
      });
    }

    // Delete setting
    await db.run('DELETE FROM site_settings WHERE setting_key = ?', [key]);

    res.json({
      success: true,
      message: 'Ayar başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayar silinirken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
