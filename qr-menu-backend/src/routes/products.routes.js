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
    const { category_id, is_active, is_featured, search } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category_id !== undefined) {
      query += ' AND category_id = ?';
      params.push(parseInt(category_id));
    }

    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    if (is_featured !== undefined) {
      query += ' AND is_featured = ?';
      params.push(is_featured === 'true' || is_featured === '1' ? 1 : 0);
    }

    if (search !== undefined) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY sort_order, name';

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

    const product = await db.getOne('SELECT * FROM products WHERE id = ?', [productId]);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    const options = await db.query(
      'SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order',
      [productId]
    );

    product.options = options;

    const translations = await db.query(
      'SELECT * FROM product_translations WHERE product_id = ?',
      [productId]
    );

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
      duration,
      image_url,
      options // Yeni eklenen seçenekler
    } = req.body;
    const translations = req.body.translations ? JSON.parse(req.body.translations) : [];

    if (!category_id || !name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Kategori, ürün adı ve fiyat gereklidir'
      });
    }

    const categoryExists = await db.getOne('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Seçilen kategori bulunamadı'
      });
    }

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    let finalImageUrl = null;

    if (req.file) {
      finalImageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    } else if (image_url) {
      if (image_url.startsWith('/uploads/')) {
        finalImageUrl = `${baseUrl}${image_url}`;
      } else {
        finalImageUrl = image_url;
      }
    }

    const result = await db.run(
      'INSERT INTO products (category_id, name, description, price, image_url, is_active, is_featured, sort_order, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        category_id,
        name,
        description || null,
        parseFloat(price),
        finalImageUrl,
        is_active === false || is_active === 'false' || is_active === '0' ? 0 : 1,
        is_featured === true || is_featured === 'true' || is_featured === '1' ? 1 : 0,
        sort_order || 0,
        duration || 0
      ]
    );

    if (!result || !result.insertId) {
      throw new Error('Ürün oluşturma başarısız oldu');
    }

    const productId = result.insertId;

    // Seçenekleri ekle
    if (options && Array.isArray(JSON.parse(options))) {
      const parsedOptions = JSON.parse(options);
      for (const option of parsedOptions) {
        await db.run(
          'INSERT INTO product_options (product_id, name, description, price_modifier, is_active, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            productId,
            option.name,
            option.description || null,
            parseFloat(option.price_modifier) || 0,
            option.is_active === false ? 0 : 1,
            option.is_required === true ? 1 : 0,
            parseInt(option.sort_order) || 0
          ]
        );
      }
    }

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

    const newProduct = await db.getOne('SELECT * FROM products WHERE id = ?', [productId]);
    const productOptions = await db.query(
      'SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order',
      [productId]
    );

    newProduct.options = productOptions;

    const productTranslations = await db.query(
      'SELECT * FROM product_translations WHERE product_id = ?',
      [productId]
    );

    newProduct.translations = productTranslations;

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
      duration,
      remove_image,
      image_url,
      options // Yeni eklenen seçenekler
    } = req.body;
    const translations = req.body.translations ? JSON.parse(req.body.translations) : [];
    const parsedOptions = options ? JSON.parse(options) : [];

    const product = await db.getOne('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    if (category_id && category_id !== product.category_id) {
      const categoryExists = await db.getOne('SELECT id FROM categories WHERE id = ?', [category_id]);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Seçilen kategori bulunamadı'
        });
      }
    }

    let sql = 'UPDATE products SET ';
    const params = [];
    const updates = [];

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
      params.push(is_active === false || is_active === 'false' || is_active === '0' ? 0 : 1);
    }

    if (is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(is_featured === true || is_featured === 'true' || is_featured === '1' ? 1 : 0);
    }

    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(parseInt(sort_order) || 0);
    }

    if (duration !== undefined) {
      updates.push('duration = ?');
      params.push(parseInt(duration) || 0);
    }

    let oldImageUrl = product.image_url;
    let newImageUrl = oldImageUrl;

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

    if (req.file) {
      newImageUrl = `${baseUrl}/uploads/${req.file.filename}`;
      updates.push('image_url = ?');
      params.push(newImageUrl);
    } else if (remove_image === 'true' && oldImageUrl) {
      newImageUrl = null;
      updates.push('image_url = ?');
      params.push(null);
    } else if (image_url) {
      if (image_url.startsWith('/uploads/')) {
        newImageUrl = `${baseUrl}${image_url}`;
      } else {
        newImageUrl = image_url;
      }
      updates.push('image_url = ?');
      params.push(newImageUrl);
    }

    if (updates.length === 0 && (!translations || translations.length === 0) && (!parsedOptions || parsedOptions.length === 0)) {
      return res.json({
        success: true,
        message: 'Güncellenecek bilgi bulunamadı',
        data: product
      });
    }

    if (updates.length > 0) {
      sql += updates.join(', ') + ' WHERE id = ?';
      params.push(productId);

      await db.run(sql, params);

      if (oldImageUrl && newImageUrl !== oldImageUrl) {
        const oldImagePath = path.join(__dirname, '../../public', oldImageUrl.replace(/^.*\/uploads\//, '/uploads/'));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    // Seçenekleri güncelle: Mevcut seçenekleri sil ve yenilerini ekle
    if (parsedOptions && Array.isArray(parsedOptions)) {
      await db.run('DELETE FROM product_options WHERE product_id = ?', [productId]);

      for (const option of parsedOptions) {
        await db.run(
          'INSERT INTO product_options (product_id, name, description, price_modifier, is_active, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            productId,
            option.name,
            option.description || null,
            parseFloat(option.price_modifier) || 0,
            option.is_active === false ? 0 : 1,
            option.is_required === true ? 1 : 0,
            parseInt(option.sort_order) || 0
          ]
        );
      }
    }

    if (translations && translations.length > 0) {
      await db.run('DELETE FROM product_translations WHERE product_id = ?', [productId]);

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

    if (category_id && category_id !== product.category_id) {
      await db.run(
        'UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1) WHERE id = ?',
        [product.category_id, product.category_id]
      );

      await db.run(
        'UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1) WHERE id = ?',
        [category_id, category_id]
      );
    } else if (is_active !== undefined) {
      await db.run(
        'UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1) WHERE id = ?',
        [product.category_id, product.category_id]
      );
    }

    const updatedProduct = await db.getOne('SELECT * FROM products WHERE id = ?', [productId]);

    const productOptions = await db.query(
      'SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order',
      [productId]
    );

    updatedProduct.options = productOptions;

    const productTranslations = await db.query(
      'SELECT * FROM product_translations WHERE product_id = ?',
      [productId]
    );

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

    const product = await db.getOne('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    await db.run('DELETE FROM product_options WHERE product_id = ?', [productId]);
    await db.run('DELETE FROM product_translations WHERE product_id = ?', [productId]);
    await db.run('DELETE FROM products WHERE id = ?', [productId]);

    await db.run(
      'UPDATE categories SET product_count = (SELECT COUNT(*) FROM products WHERE category_id = ? AND is_active = 1) WHERE id = ?',
      [product.category_id, product.category_id]
    );

    if (product.image_url) {
      const imagePath = path.join(__dirname, '../../public', product.image_url.replace(/^.*\/uploads\//, '/uploads/'));
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

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

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

    const product = await db.getOne('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Seçenek adı gereklidir'
      });
    }

    const priceModifier = parseFloat(price_modifier) || 0;
    if (isNaN(priceModifier)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz fiyat farkı'
      });
    }

    const result = await db.run(
      'INSERT INTO product_options (product_id, name, description, price_modifier, is_active, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        productId,
        name,
        description || null,
        priceModifier,
        is_active === false ? 0 : 1,
        is_required === true ? 1 : 0,
        parseInt(sort_order) || 0
      ]
    );

    const optionId = result.insertId;

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

    const product = await db.getOne('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    const options = await db.query(
      'SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order',
      [productId]
    );

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

    const option = await db.getOne('SELECT * FROM product_options WHERE id = ?', [optionId]);
    if (!option) {
      return res.status(404).json({
        success: false,
        message: 'Ürün seçeneği bulunamadı'
      });
    }

    let sql = 'UPDATE product_options SET ';
    const params = [];
    const updates = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (price_modifier !== undefined) {
      const priceModifier = parseFloat(price_modifier) || 0;
      if (isNaN(priceModifier)) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz fiyat farkı'
        });
      }
      updates.push('price_modifier = ?');
      params.push(priceModifier);
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

    if (updates.length === 0) {
      return res.json({
        success: true,
        message: 'Güncellenecek bilgi bulunamadı',
        data: option
      });
    }

    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(optionId);

    await db.run(sql, params);

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

    const option = await db.getOne('SELECT * FROM product_options WHERE id = ?', [optionId]);
    if (!option) {
      return res.status(404).json({
        success: false,
        message: 'Ürün seçeneği bulunamadı'
      });
    }

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

// Alternative endpoint for creating options
router.post('/options', authenticateToken, authorizeRoles('admin', 'manager', 'editor'), async (req, res) => {
  try {
    const { product_id, name, description, price_modifier, is_active, is_required, sort_order } = req.body;

    const product = await db.getOne('SELECT id FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Seçenek adı gereklidir'
      });
    }

    const priceModifier = parseFloat(price_modifier) || 0;
    if (isNaN(priceModifier)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz fiyat farkı'
      });
    }

    const result = await db.run(
      'INSERT INTO product_options (product_id, name, description, price_modifier, is_active, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        product_id,
        name,
        description || null,
        priceModifier,
        is_active === false ? 0 : 1,
        is_required === true ? 1 : 0,
        parseInt(sort_order) || 0
      ]
    );

    const optionId = result.insertId;

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