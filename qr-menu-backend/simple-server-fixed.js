const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Sample data
const products = [
  {
    id: 1,
    name: 'Köfte',
    description: 'Lezzetli el yapımı köfte',
    price: 120,
    category_id: 1,
    image_url: '/uploads/product-kofte.jpg',
    is_active: 1
  },
  {
    id: 2,
    name: 'Tavuk Şiş',
    description: 'Marine edilmiş tavuk parçaları',
    price: 100,
    category_id: 1,
    image_url: '/uploads/product-tavuk.jpg',
    is_active: 1
  },
  {
    id: 3,
    name: 'Ayran',
    description: 'Ev yapımı taze ayran',
    price: 15,
    category_id: 2,
    image_url: '/uploads/product-ayran.jpg',
    is_active: 1
  },
  {
    id: 4,
    name: 'Kola',
    description: '330ml kutu',
    price: 20,
    category_id: 2,
    image_url: '/uploads/product-kola.jpg',
    is_active: 1
  }
];

const categories = [
  {
    id: 1,
    name: 'Ana Yemekler',
    description: 'Lezzetli ana yemeklerimiz',
    image_url: '/uploads/category-main.jpg',
    is_active: 1,
    sort_order: 1,
    product_count: 2,
    translations: []
  },
  {
    id: 2,
    name: 'İçecekler',
    description: 'Serinletici içecekler',
    image_url: '/uploads/category-drinks.jpg',
    is_active: 1,
    sort_order: 2,
    product_count: 2,
    translations: []
  }
];

const settings = [
  { key: 'restaurant_name', value: 'Demo Restaurant', type: 'text' },
  { key: 'restaurant_slogan', value: 'En lezzetli yemekler', type: 'text' },
  { key: 'logo_url', value: '/uploads/logo.png', type: 'image' },
  { key: 'working_hours', value: '09:00 - 22:00', type: 'text' }
];

const banners = [
  {
    id: 1,
    title: 'Yeni Tatlar',
    subtitle: 'Özel menümüzde yeni tatlar sizi bekliyor',
    image_url: '/banner1.jpg',
    button_text: 'Keşfet',
    button_link: '/menu',
    display_order: 1,
    is_active: 1
  },
  {
    id: 2,
    title: 'İndirim',
    subtitle: '%15 indirim fırsatı',
    image_url: '/banner2.jpg',
    button_text: 'İncele',
    button_link: '/menu',
    display_order: 2,
    is_active: 1
  }
];

const socialMedia = [
  {
    id: 1,
    platform: 'Facebook',
    url: 'https://facebook.com/qrmenu',
    icon: 'facebook',
    display_order: 1,
    is_active: 1
  },
  {
    id: 2,
    platform: 'Instagram',
    url: 'https://instagram.com/qrmenu',
    icon: 'instagram',
    display_order: 2,
    is_active: 1
  }
];

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// API Info
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'QR Menu API is running',
    version: '1.0.0'
  });
});

// Auth API
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  console.log('Login attempt:', { username, password });

  // Basic validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Kullanıcı adı ve şifre gereklidir'
    });
  }

  // Simple login - accept 'admin'/'admin123' credentials
  if (username === 'admin' && password === 'admin123') {
    // Create JWT token
    const token = jwt.sign(
      {
        id: 1,
        username: 'admin',
        role: 'admin'
      },
      'secret-key',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        user: {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          is_active: 1
        },
        token
      }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Geçersiz kullanıcı adı veya şifre'
  });
});

// Get user profile
app.get('/api/auth/profile', (req, res) => {
  // Here you would verify the token, but for test purposes we'll just return a sample profile
  res.json({
    success: true,
    data: {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      is_active: 1
    }
  });
});

// Products API
app.get('/api/products', (req, res) => {
  console.log('GET /api/products', req.query);

  const { category_id, is_active } = req.query;

  let filteredProducts = [...products];

  if (category_id) {
    filteredProducts = filteredProducts.filter(p => p.category_id === parseInt(category_id));
  }

  if (is_active !== undefined) {
    const isActiveValue = is_active === 'true' || is_active === '1' ? 1 : 0;
    filteredProducts = filteredProducts.filter(p => p.is_active === isActiveValue);
  }

  res.json({
    success: true,
    data: filteredProducts
  });
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Ürün bulunamadı'
    });
  }

  res.json({
    success: true,
    data: product
  });
});

// Categories API
app.get('/api/categories', (req, res) => {
  console.log('GET /api/categories', req.query);

  const { is_active } = req.query;

  let filteredCategories = [...categories];

  if (is_active !== undefined) {
    const isActiveValue = is_active === 'true' || is_active === '1' ? 1 : 0;
    filteredCategories = filteredCategories.filter(c => c.is_active === isActiveValue);
  }

  res.json({
    success: true,
    data: filteredCategories
  });
});

app.get('/api/categories/:id', (req, res) => {
  const category = categories.find(c => c.id === parseInt(req.params.id));

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Kategori bulunamadı'
    });
  }

  res.json({
    success: true,
    data: category
  });
});

// Settings API
app.get('/api/settings', (req, res) => {
  res.json({
    success: true,
    data: settings
  });
});

app.get('/api/settings/:key', (req, res) => {
  const key = req.params.key;
  const setting = settings.find(s => s.key === key);

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
});

// Banners API
app.get('/api/banners', (req, res) => {
  res.json({
    success: true,
    data: banners
  });
});

// Social Media API
app.get('/api/social-media', (req, res) => {
  res.json({
    success: true,
    data: socialMedia
  });
});

// File upload mock endpoints
app.post('/api/products/upload', (req, res) => {
  res.json({
    success: true,
    data: {
      image_url: '/uploads/sample-product.jpg'
    }
  });
});

app.post('/api/categories/upload', (req, res) => {
  res.json({
    success: true,
    data: {
      image_url: '/uploads/sample-category.jpg'
    }
  });
});

app.post('/api/settings/upload/:key', (req, res) => {
  const key = req.params.key;

  res.json({
    success: true,
    data: {
      file_url: `/uploads/sample-${key}.jpg`
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
