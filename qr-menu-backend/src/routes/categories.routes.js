const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Upload Directory Configuration
const uploadDir = path.join(__dirname, '../../public/uploads');

// Ensure upload directory exists
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
    cb(null, 'category-' + uniqueSuffix + ext);
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

// Get all categories
router.get('/', async (req, res) => {
  try {
    const { is_active } = req.query;

    let query = `
      SELECT c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
    `;

    const params = [];

    // Add is_active filter if provided
    if (is_active !== undefined) {
      query += ' WHERE c.is_active = ?';
      params.push(is_active === true || is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    query += ' GROUP BY c.id ORDER BY c.sort_order, c.name';

    const categories = await db.query(query, params);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriler alınamadı',
      error: error.message
    });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await db.getOne(`
      SELECT c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      WHERE c.id = ?
      GROUP BY c.id
    `, [categoryId]);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı'
      });
    }

    // Get category translations
    const translations = await db.query(
      'SELECT * FROM category_translations WHERE category_id = ?',
      [categoryId]
    );

    // Add translations to category object
    category.translations = translations;

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori bilgileri alınamadı',
      error: error.message
    });
  }
});

// Upload category image
router.post('/upload', authenticateToken, authorizeRoles('admin', 'manager', 'editor'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Resim dosyası gereklidir'
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        image_url: imageUrl
      }
    });
  } catch (error) {
    console.error('Category image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Resim yükleme başarısız oldu',
      error: error.message
    });
  }
});

// Create category
router.post('/', authenticateToken, authorizeRoles('admin', 'manager', 'editor'), upload.single('image'), async (req, res) => {
  try {
    const { name, description, is_active, sort_order, image_url } = req.body;
    const translations = req.body.translations ? JSON.parse(req.body.translations) : [];

    // Validate name
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Kategori adı gereklidir'
      });
    }

    // Debug: Log the uploaded file info
    console.log('Uploaded file:', req.file);

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    let imageUrl = image_url || null; // Use provided image_url if no file uploaded

    // Process uploaded image if exists
    if (req.file) {
      imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
      console.log('Generated image URL:', imageUrl); // Debug log
    }else if (image_url) {
      // Eğer image_url göreceli bir yol ise (örneğin, /uploads/...), tam URL’ye çevir
      if (image_url.startsWith('/uploads/')) {
        imageUrl = `${baseUrl}${image_url}`;
      } else {
        imageUrl = image_url; // Zaten tam URL ise olduğu gibi kullan
      }
      console.log('No image file uploaded, using provided image_url:', imageUrl);
    } else {
      console.log('No image provided');
    }

    // Debug: Log the data before database insertion
    console.log('Inserting category with data:', {
      name,
      description,
      imageUrl,
      is_active,
      sort_order
    });
    const isActiveValue = is_active === false || is_active === 'false' || is_active === '0' ? 0 : 1;
    // Insert category
    const result = await db.run(
      'INSERT INTO categories (name, description, image_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?)',
      [
        name,
        description || null,
        imageUrl, // Make sure this is not null if you want to save it
        isActiveValue,
        sort_order || 0
      ]
    );

    // Debug: Log the insertion result
    console.log('Database insertion result:', result);

    if (!result || !result.insertId) {
      throw new Error('Kategori oluşturma başarısız oldu');
    }

    const categoryId = result.insertId;

    // Add translations if provided
    if (translations.length > 0) {
      for (const translation of translations) {
        await db.run(
          'INSERT INTO category_translations (category_id, language_code, name, description) VALUES (?, ?, ?, ?)',
          [
            categoryId,
            translation.language_code,
            translation.name,
            translation.description || null
          ]
        );
      }
    }

    // Get created category with image_url
    const newCategory = await db.getOne('SELECT id, name, description, image_url, is_active, sort_order FROM categories WHERE id = ?', [categoryId]);

    // Debug: Log the retrieved category
    console.log('Retrieved category:', newCategory);

    // Get category translations
    const categoryTranslations = await db.query(
      'SELECT * FROM category_translations WHERE category_id = ?',
      [categoryId]
    );

    // Add translations to category object
    newCategory.translations = categoryTranslations;

    res.status(201).json({
      success: true,
      message: 'Kategori başarıyla oluşturuldu',
      data: newCategory
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori oluşturma başarısız oldu',
      error: error.message
    });
  }
});

// Update category
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager', 'editor'), upload.single('image'), async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description, is_active, sort_order, remove_image, image_url } = req.body;
    const translations = req.body.translations ? JSON.parse(req.body.translations) : [];

    // Check if category exists
    const category = await db.getOne('SELECT * FROM categories WHERE id = ?', [categoryId]);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı'
      });
    }

    // Start building the query and parameters
    let sql = 'UPDATE categories SET ';
    const params = [];
    const updates = [];

    // Add name if provided
    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    // Add description if provided
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    const isActiveValue = is_active === false || is_active === 'false' || is_active === '0' ? 0 : 1;
    updates.push('is_active = ?');
    params.push(isActiveValue);
    console.log('Processed is_active value:', isActiveValue);

    // Add sort_order if provided
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(parseInt(sort_order) || 0);
    }

    // Process image
    let oldImageUrl = category.image_url;
    let newImageUrl = oldImageUrl;

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    console.log('Base URL:', baseUrl);

    // If new image uploaded
    if (req.file) {
      newImageUrl = `${baseUrl}/uploads/${req.file.filename}`;
      updates.push('image_url = ?');
      params.push(newImageUrl);
    }
    // If remove_image flag is true
    else if (remove_image === 'true' && oldImageUrl) {
      newImageUrl = null;
      updates.push('image_url = ?');
      params.push(null);
    }else if (image_url) {
      // Eğer image_url göreceli bir yol ise, tam URL’ye çevir
      if (image_url.startsWith('/uploads/')) {
        newImageUrl = `${baseUrl}${image_url}`;
      } else {
        newImageUrl = image_url;
      }
  updates.push('image_url = ?');
  params.push(newImageUrl);
  console.log('Using provided image_url:', newImageUrl);
}

    // If no updates, check if there are translations updates
    if (updates.length === 0 && (!translations || translations.length === 0)) {
      return res.json({
        success: true,
        message: 'Güncellenecek bilgi bulunamadı',
        data: category
      });
    }

    // If there are category updates
    if (updates.length > 0) {
      // Complete the SQL query
      sql += updates.join(', ') + ' WHERE id = ?';
      params.push(categoryId);

      // Update category
      await db.run(sql, params);

      // Delete old image if replaced and exists on filesystem
      if (oldImageUrl && newImageUrl !== oldImageUrl) {
        const oldImagePath = path.join(__dirname, '../../public', oldImageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    // Handle translations
    if (translations && translations.length > 0) {
      // Delete existing translations
      await db.run('DELETE FROM category_translations WHERE category_id = ?', [categoryId]);

      // Add new translations
      for (const translation of translations) {
        await db.run(
          'INSERT INTO category_translations (category_id, language_code, name, description) VALUES (?, ?, ?, ?)',
          [
            categoryId,
            translation.language_code,
            translation.name,
            translation.description || null
          ]
        );
      }
    }

    // Get updated category
    const updatedCategory = await db.getOne('SELECT * FROM categories WHERE id = ?', [categoryId]);

    // Get category translations
    const categoryTranslations = await db.query(
      'SELECT * FROM category_translations WHERE category_id = ?',
      [categoryId]
    );

    // Add translations to category object
    updatedCategory.translations = categoryTranslations;

    res.json({
      success: true,
      message: 'Kategori başarıyla güncellendi',
      data: updatedCategory
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Delete category
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if category exists
    const category = await db.getOne('SELECT * FROM categories WHERE id = ?', [categoryId]);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı'
      });
    }

    // Check if category has products
    const productsCount = await db.getOne(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [categoryId]
    );

    if (productsCount.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Kategoriye ait ürünler var. Önce bu ürünleri silmeli veya başka bir kategoriye taşımalısınız.'
      });
    }

    // Delete category
    const result = await db.run('DELETE FROM categories WHERE id = ?', [categoryId]);

    if (result.affectedRows !== 1) {
      throw new Error('Kategori silinirken bir hata oluştu');
    }

    // Delete image if exists
    if (category.image_url) {
      const imagePath = path.join(__dirname, '../../public', category.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({
      success: true,
      message: 'Kategori başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori silinirken bir hata oluştu',
      error: error.message
    });
  }
});

// Update category order
router.put('/order', authenticateToken, authorizeRoles('admin', 'manager', 'editor'), async (req, res) => {
  try {
    const { categoryIds } = req.body;

    if (!categoryIds || !Array.isArray(categoryIds)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir kategori sıralaması gönderilmelidir'
      });
    }

    // Use a transaction to ensure all updates are atomic
    await db.transaction(async (connection) => {
      for (let i = 0; i < categoryIds.length; i++) {
        await connection.query(
          'UPDATE categories SET sort_order = ? WHERE id = ?',
          [i, categoryIds[i]]
        );
      }
    });

    res.json({
      success: true,
      message: 'Kategori sıralaması başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Update category order error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori sıralaması güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

module.exports = router;
