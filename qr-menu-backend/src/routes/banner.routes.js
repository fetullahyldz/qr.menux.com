const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Upload Directory Configuration
const uploadDir = path.join(__dirname, '../../public/uploads');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'banner-' + uniqueSuffix + ext);
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

// Get all banners
router.get('/', async (req, res) => {
  try {
    const { is_active } = req.query;

    let query = 'SELECT * FROM banners WHERE 1=1';
    const params = [];

    // Add filters if provided
    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    // Add ordering
    query += ' ORDER BY display_order';

    const banners = await db.query(query, params);

    res.json({
      success: true,
      data: banners
    });
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Banner bilgileri alınamadı',
      error: error.message
    });
  }
});

// Get banner by ID
router.get('/:id', async (req, res) => {
  try {
    const bannerId = req.params.id;

    const banner = await db.getOne('SELECT * FROM banners WHERE id = ?', [bannerId]);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner bulunamadı'
      });
    }

    res.json({
      success: true,
      data: banner
    });
  } catch (error) {
    console.error('Get banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Banner bilgileri alınamadı',
      error: error.message
    });
  }
});

// Add banner image upload endpoint
router.post('/upload', authenticateToken, authorizeRoles('admin', 'manager'), upload.single('image'), async (req, res) => {
  try {
    console.log('Banner image upload request received');
    console.log('Request headers:', req.headers);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Request body keys:', Object.keys(req.body));

    if (!req.file) {
      console.error('No image provided for banner upload');
      console.error('Form data received:', req.body);

      return res.status(400).json({
        success: false,
        message: 'Yüklenecek banner görseli bulunamadı'
      });
    }

    console.log('Uploaded banner image details:', {
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

    // Create image URL
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    console.log(`Banner image uploaded successfully, URL: ${imageUrl}`);

    res.json({
      success: true,
      message: 'Banner görseli başarıyla yüklendi',
      data: {
        image_url: imageUrl
      }
    });
  } catch (error) {
    console.error('Banner image upload error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Banner görseli yüklenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Create banner (admin only)
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), upload.single('image'), async (req, res) => {
  try {
    console.log('Create banner request received');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const { title, subtitle, button_text, button_link, display_order, is_active, image_url } = req.body;

    // Use image from file upload or from request body (handle both cases)
    let bannerImageUrl = null;

    // If image uploaded as file
    if (req.file) {
      bannerImageUrl = `/uploads/${req.file.filename}`;
      console.log(`Using uploaded image file: ${bannerImageUrl}`);
    }
    // If image URL provided in request body
    else if (image_url) {
      bannerImageUrl = image_url;
      console.log(`Using provided image URL: ${bannerImageUrl}`);
    }
    // No image provided - use placeholder
    else {
      bannerImageUrl = 'https://via.placeholder.com/800x300?text=No+Image';
      console.log(`No image provided, using placeholder: ${bannerImageUrl}`);
    }

    console.log('Final banner image URL:', bannerImageUrl);

    // Insert banner
    const result = await db.run(
      `INSERT INTO banners (
        title, subtitle, image_url, button_text, button_link, display_order, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title || null,
        subtitle || null,
        bannerImageUrl,
        button_text || null,
        button_link || null,
        display_order || 0,
        is_active === 'false' || is_active === '0' ? 0 : 1
      ]
    );

    const bannerId = result.insertId;

    // Get created banner
    const newBanner = await db.getOne('SELECT * FROM banners WHERE id = ?', [bannerId]);

    res.status(201).json({
      success: true,
      message: 'Banner başarıyla oluşturuldu',
      data: newBanner
    });
  } catch (error) {
    console.error('Create banner error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Banner oluşturma başarısız oldu',
      error: error.message
    });
  }
});

// Update banner (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager'), upload.single('image'), async (req, res) => {
  try {
    console.log('Update banner request received');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const bannerId = req.params.id;
    const { title, subtitle, button_text, button_link, display_order, is_active, remove_image, image_url } = req.body;

    // Check if banner exists
    const banner = await db.getOne('SELECT * FROM banners WHERE id = ?', [bannerId]);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner bulunamadı'
      });
    }

    // Start building the query and parameters
    let sql = 'UPDATE banners SET ';
    const params = [];
    const updates = [];

    // Add fields if provided
    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title || null);
    }

    if (subtitle !== undefined) {
      updates.push('subtitle = ?');
      params.push(subtitle || null);
    }

    if (button_text !== undefined) {
      updates.push('button_text = ?');
      params.push(button_text || null);
    }

    if (button_link !== undefined) {
      updates.push('button_link = ?');
      params.push(button_link || null);
    }

    if (display_order !== undefined) {
      updates.push('display_order = ?');
      params.push(parseInt(display_order) || 0);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active === 'false' || is_active === '0' ? 0 : 1);
    }

    // Process image
    let oldImageUrl = banner.image_url;
    let newImageUrl = oldImageUrl;

    // Handle different image scenarios
    // 1. New file uploaded
    if (req.file) {
      console.log('New image file uploaded:', req.file.filename);
      newImageUrl = `/uploads/${req.file.filename}`;
      updates.push('image_url = ?');
      params.push(newImageUrl);
    }
    // 2. Image URL provided in request
    else if (image_url && image_url !== oldImageUrl) {
      console.log('New image URL provided:', image_url);
      newImageUrl = image_url;
      updates.push('image_url = ?');
      params.push(newImageUrl);
    }
    // 3. Remove image flag is true
    else if (remove_image === 'true' && oldImageUrl) {
      console.log('Removing image:', oldImageUrl);
      newImageUrl = null;
      updates.push('image_url = ?');
      params.push(null);
    }

    // If no updates, return success
    if (updates.length === 0) {
      return res.json({
        success: true,
        message: 'Güncellenecek bilgi bulunamadı',
        data: banner
      });
    }

    // Complete the SQL query
    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(bannerId);

    console.log('Executing update query:', { sql, params });

    // Update banner
    await db.run(sql, params);

    // Delete old image file if replaced and exists on filesystem
    if (oldImageUrl && newImageUrl !== oldImageUrl && !oldImageUrl.startsWith('https://') && !oldImageUrl.startsWith('data:')) {
      try {
        const oldImagePath = path.join(__dirname, '../../public', oldImageUrl);
        console.log('Checking if old image exists:', oldImagePath);
        if (fs.existsSync(oldImagePath)) {
          console.log('Deleting old image file:', oldImagePath);
          fs.unlinkSync(oldImagePath);
        }
      } catch (fileError) {
        console.error('Error deleting old image file:', fileError);
      }
    }

    // Get updated banner
    const updatedBanner = await db.getOne('SELECT * FROM banners WHERE id = ?', [bannerId]);

    res.json({
      success: true,
      message: 'Banner başarıyla güncellendi',
      data: updatedBanner
    });
  } catch (error) {
    console.error('Update banner error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Banner güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Delete banner (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const bannerId = req.params.id;

    // Check if banner exists
    const banner = await db.getOne('SELECT * FROM banners WHERE id = ?', [bannerId]);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner bulunamadı'
      });
    }

    // Delete banner
    await db.run('DELETE FROM banners WHERE id = ?', [bannerId]);

    // Delete image if exists
    if (banner.image_url) {
      const imagePath = path.join(__dirname, '../../public', banner.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({
      success: true,
      message: 'Banner başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Banner silinirken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
