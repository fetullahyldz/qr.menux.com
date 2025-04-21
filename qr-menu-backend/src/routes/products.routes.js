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
    cb(null, 'product-' + uniqueSuffix + ext);
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
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  }
});

// GET ALL PRODUCTS
router.get('/', async (req, res) => {
  try {
    const { category_id, is_active, is_featured } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    // Add category_id filter if provided
    if (category_id !== undefined) {
      query += ' AND category_id = ?';
      params.push(parseInt(category_id));
    }

    // Add is_active filter if provided
    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    // Add is_featured filter if provided
    if (is_featured !== undefined) {
      query += ' AND is_featured = ?';
      params.push(is_featured === 'true' || is_featured === '1' ? 1 : 0);
    }

    // Add order by
    query += ' ORDER BY sort_order, name';

    // Execute query
    const products = await db.query(query, params);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürünler alınamadı',
      error: error.message
    });
  }
});

// GET PRODUCT BY ID
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;

    // Get product
    const product = await db.getOne('SELECT * FROM products WHERE id = ?', [productId]);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    // Get product options
    const options = await db.query(
      'SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order',
      [productId]
    );

    // Add options to product
    product.options = options;

    // Get product translations
    const translations = await db.query(
      'SELECT * FROM product_translations WHERE product_id = ?',
      [productId]
    );

    // Add translations to product
    product.translations = translations;

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün bilgileri alınamadı',
      error: error.message
    });
  }
});

// CREATE PRODUCT
router.post('/', authenticateToken, authorizeRoles('admin', 'manager', 'editor'), upload.single('image'), async (req, res) => {
  try {
    const {
      category_id,
      name,
      description,
      price,
      is_active,
      is_featured,
      sort_order,
      image_url 
    } = req.body;
    const translations = req.body.translations ? JSON.parse(req.body.translations) : [];

    // Validate input
    if (!category_id || !name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Kategori, ürün adı ve fiyat gereklidir'
      });
    }

    // Check if category exists
    const categoryExists = await db.getOne('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Seçilen kategori bulunamadı'
      });
    }

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    console.log('Base URL:', baseUrl); // baseUrl’yi logla
    let finalImageUrl =  null

   // Process uploaded image if exists
   if (req.file) {
    finalImageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    console.log('Image uploaded, URL:', finalImageUrl);
  } else if (image_url) {
    // Eğer image_url göreceli bir yol ise (örneğin, /uploads/...), tam URL’ye çevir
    if (image_url.startsWith('/uploads/')) {
      finalImageUrl = `${baseUrl}${image_url}`;
    } else {
      finalImageUrl = image_url; // Zaten tam URL ise olduğu gibi kullan
    }
    console.log('No image file uploaded, using provided image_url:', finalImageUrl);
  } else {
    console.log('No image provided');
  }

    // Insert product
    const result = await db.run(
      'INSERT INTO products (category_id, name, description, price, image_url, is_active, is_featured, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        category_id,
        name,
        description || null,
        parseFloat(price),
        finalImageUrl,
        is_active === 'false' || is_active === '0' ? 0 : 1,
        is_featured === 'true' || is_featured === '1' ? 1 : 0,
        sort_order || 0
      ]
    );

    if (!result || !result.insertId) {
      throw new Error('Ürün oluşturma başarısız oldu');
    }

    const productId = result.insertId;

    // Add translations if provided
    if (translations.length > 0) {
      for (const translation of translations) {
        await db.run(
          'INSERT INTO product_translations (product_id, language_code, name, description) VALUES (?, ?, ?, ?)',
          [
            productId,
            translation.language_code,
            translation.name,
            translation.description || null
          ]
        );
      }
    }

    // Get created product
    const newProduct = await db.getOne('SELECT * FROM products WHERE id = ?', [productId]);

    // Get product options (should be empty for a new product)
    const options = await db.query(
      'SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order',
      [productId]
    );

    // Add options to product
    newProduct.options = options;

    // Get product translations
    const productTranslations = await db.query(
      'SELECT * FROM product_translations WHERE product_id = ?',
      [productId]
    );

    // Add translations to product
    newProduct.translations = productTranslations;

    // Update product count for the category
    await db.run(
      'UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1) WHERE id = ?',
      [category_id, category_id]
    );

    res.status(201).json({
      success: true,
      message: 'Ürün başarıyla oluşturuldu',
      data: newProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün oluşturma başarısız oldu',
      error: error.message
    });
  }
});

// UPDATE PRODUCT
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager', 'editor'), upload.single('image'), async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      category_id,
      name,
      description,
      price,
      is_active,
      is_featured,
      sort_order,
      remove_image,
      image_url 
    } = req.body;
    const translations = req.body.translations ? JSON.parse(req.body.translations) : [];

    // Check if product exists
    const product = await db.getOne('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    // If category_id is changing, check if new category exists
    if (category_id && category_id !== product.category_id) {
      const categoryExists = await db.getOne('SELECT id FROM categories WHERE id = ?', [category_id]);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Seçilen kategori bulunamadı'
        });
      }
    }

    // Start building the query and parameters
    let sql = 'UPDATE products SET ';
    const params = [];
    const updates = [];

    // Add fields if provided
    if (category_id) {
      updates.push('category_id = ?');
      params.push(category_id);
    }

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (price !== undefined) {
      updates.push('price = ?');
      params.push(parseFloat(price));
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active === 'false' || is_active === '0' ? 0 : 1);
    }

    if (is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(is_featured === 'true' || is_featured === '1' ? 1 : 0);
    }

    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(parseInt(sort_order) || 0);
    }

    // Process image
    let oldImageUrl = product.image_url;
    let newImageUrl = oldImageUrl;

       // Base URL’yi oluştur
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    console.log('Base URL:', baseUrl);

    // If new image uploaded
    if (req.file) {    
      newImageUrl = `${baseUrl}/uploads/${req.file.filename}`;
      updates.push('image_url = ?');
      params.push(newImageUrl);
      console.log('Image uploaded, URL:', newImageUrl);
    }
    // If remove_image flag is true
    else if (remove_image === 'true' && oldImageUrl) {
      newImageUrl = null;
      updates.push('image_url = ?');
      params.push(null);
      console.log('Image removed, setting image_url to null');
    }
    else if (image_url) {
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
        data: product
      });
    }

    // If there are product updates
    if (updates.length > 0) {
      // Complete the SQL query
      sql += updates.join(', ') + ' WHERE id = ?';
      params.push(productId);

      // Update product
      await db.run(sql, params);

      // Delete old image if replaced and exists on filesystem
      if (oldImageUrl && newImageUrl !== oldImageUrl) {
        const oldImagePath = path.join(__dirname, '../../public', oldImageUrl.replace(/^.*\/uploads\//, '/uploads/'));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    // Handle translations
    if (translations && translations.length > 0) {
      // Delete existing translations
      await db.run('DELETE FROM product_translations WHERE product_id = ?', [productId]);

      // Add new translations
      for (const translation of translations) {
        await db.run(
          'INSERT INTO product_translations (product_id, language_code, name, description) VALUES (?, ?, ?, ?)',
          [
            productId,
            translation.language_code,
            translation.name,
            translation.description || null
          ]
        );
      }
    }

    // Update product count for old and new categories if changed
    if (category_id && category_id !== product.category_id) {
      // Update old category product count
      await db.run(
        'UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1) WHERE id = ?',
        [product.category_id, product.category_id]
      );

      // Update new category product count
      await db.run(
        'UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1) WHERE id = ?',
        [category_id, category_id]
      );
    }
    // If is_active changed, update the product count
    else if (is_active !== undefined) {
      await db.run(
        'UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1) WHERE id = ?',
        [product.category_id, product.category_id]
      );
    }

    // Get updated product
    const updatedProduct = await db.getOne('SELECT * FROM products WHERE id = ?', [productId]);

    // Get product options
    const options = await db.query(
      'SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order',
      [productId]
    );

    // Add options to product
    updatedProduct.options = options;

    // Get product translations
    const productTranslations = await db.query(
      'SELECT * FROM product_translations WHERE product_id = ?',
      [productId]
    );

    // Add translations to product
    updatedProduct.translations = productTranslations;

    res.json({
      success: true,
      message: 'Ürün başarıyla güncellendi',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// DELETE PRODUCT
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const productId = req.params.id;

    // Check if product exists
    const product = await db.getOne('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    // Delete product options
    await db.run('DELETE FROM product_options WHERE product_id = ?', [productId]);

    // Delete product translations
    await db.run('DELETE FROM product_translations WHERE product_id = ?', [productId]);

    // Delete product
    await db.run('DELETE FROM products WHERE id = ?', [productId]);

    // Update category product count
    await db.run(
      'UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1) WHERE id = ?',
      [product.category_id, product.category_id]
    );

    // Delete image if exists
    if (product.image_url) {
      const imagePath = path.join(__dirname, '../../public', product.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({
      success: true,
      message: 'Ürün başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün silinirken bir hata oluştu',
      error: error.message
    });
  }
});

// Upload product image
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
    console.error('Product image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Resim yükleme başarısız oldu',
      error: error.message
    });
  }
});

// Create option for a product
router.post('/:id/options', authenticateToken, authorizeRoles('admin', 'manager', 'editor'), async (req, res) => {
  try {
    const productId = req.params.id;
    const { name, description, price_modifier, is_active, is_required, sort_order } = req.body;

    // Check if product exists
    const product = await db.getOne('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Seçenek adı gereklidir'
      });
    }

    // Insert option
    const result = await db.run(
      'INSERT INTO product_options (product_id, name, description, price_modifier, is_active, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        productId,
        name,
        description || null,
        parseFloat(price_modifier) || 0,
        is_active === false ? 0 : 1,
        is_required === true ? 1 : 0,
        sort_order || 0
      ]
    );

    const optionId = result.insertId;

    // Get created option
    const newOption = await db.getOne('SELECT * FROM product_options WHERE id = ?', [optionId]);

    res.status(201).json({
      success: true,
      message: 'Ürün seçeneği başarıyla oluşturuldu',
      data: newOption
    });
  } catch (error) {
    console.error('Create product option error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün seçeneği oluşturma başarısız oldu',
      error: error.message
    });
  }
});

// Get options for a product
router.get('/:id/options', async (req, res) => {
  try {
    const productId = req.params.id;

    // Check if product exists
    const product = await db.getOne('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    // Get product options
    const options = await db.query(`
      SELECT * FROM product_options
      WHERE product_id = ?
      ORDER BY sort_order
    `, [productId]);

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Get product options error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün seçenekleri alınamadı',
      error: error.message
    });
  }
});

// Update a product option
router.put('/options/:id', authenticateToken, authorizeRoles('admin', 'manager', 'editor'), async (req, res) => {
  try {
    const optionId = req.params.id;
    const { name, description, price_modifier, is_active, is_required, sort_order } = req.body;

    // Check if option exists
    const option = await db.getOne('SELECT * FROM product_options WHERE id = ?', [optionId]);
    if (!option) {
      return res.status(404).json({
        success: false,
        message: 'Ürün seçeneği bulunamadı'
      });
    }

    // Start building the query and parameters
    let sql = 'UPDATE product_options SET ';
    const params = [];
    const updates = [];

    // Add fields if provided
    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (price_modifier !== undefined) {
      updates.push('price_modifier = ?');
      params.push(parseFloat(price_modifier) || 0);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active === false ? 0 : 1);
    }

    if (is_required !== undefined) {
      updates.push('is_required = ?');
      params.push(is_required === true ? 1 : 0);
    }

    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(parseInt(sort_order) || 0);
    }

    // If no updates, return success
    if (updates.length === 0) {
      return res.json({
        success: true,
        message: 'Güncellenecek bilgi bulunamadı',
        data: option
      });
    }

    // Complete the SQL query
    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(optionId);

    // Update option
    await db.run(sql, params);

    // Get updated option
    const updatedOption = await db.getOne('SELECT * FROM product_options WHERE id = ?', [optionId]);

    res.json({
      success: true,
      message: 'Ürün seçeneği başarıyla güncellendi',
      data: updatedOption
    });
  } catch (error) {
    console.error('Update product option error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün seçeneği güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Delete a product option
router.delete('/options/:id', authenticateToken, authorizeRoles('admin', 'manager', 'editor'), async (req, res) => {
  try {
    const optionId = req.params.id;

    // Check if option exists
    const option = await db.getOne('SELECT * FROM product_options WHERE id = ?', [optionId]);
    if (!option) {
      return res.status(404).json({
        success: false,
        message: 'Ürün seçeneği bulunamadı'
      });
    }

    // Delete option
    await db.run('DELETE FROM product_options WHERE id = ?', [optionId]);

    res.json({
      success: true,
      message: 'Ürün seçeneği başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete product option error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün seçeneği silinirken bir hata oluştu',
      error: error.message
    });
  }
});

// Ayrıca ürün seçenekleri için alternatif bir endpoint
router.post('/options', authenticateToken, authorizeRoles('admin', 'manager', 'editor'), async (req, res) => {
  try {
    const { product_id, name, description, price_modifier, is_active, is_required, sort_order } = req.body;

    // Check if product exists
    const product = await db.getOne('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Seçenek adı gereklidir'
      });
    }

    // Insert option
    const result = await db.run(
      'INSERT INTO product_options (product_id, name, description, price_modifier, is_active, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        product_id,
        name,
        description || null,
        parseFloat(price_modifier) || 0,
        is_active === false ? 0 : 1,
        is_required === true ? 1 : 0,
        sort_order || 0
      ]
    );

    const optionId = result.insertId;

    // Get created option
    const newOption = await db.getOne('SELECT * FROM product_options WHERE id = ?', [optionId]);

    res.status(201).json({
      success: true,
      message: 'Ürün seçeneği başarıyla oluşturuldu',
      data: newOption
    });
  } catch (error) {
    console.error('Create product option error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün seçeneği oluşturma başarısız oldu',
      error: error.message
    });
  }
});

module.exports = router;
