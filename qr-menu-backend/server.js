const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const db = require('./src/config/db');
const { createTables } = require('./src/config/schema');
const qr = require('qrcode');
const multer = require('multer');

// Import Routes
const orderRoutes = require('./src/routes/order.routes');
const settingsRoutes = require('./src/routes/settings.routes');
const waiterCallRoutes = require('./src/routes/waiterCall.routes');
const feedbackRoutes = require('./src/routes/feedback.routes');
const bannerRoutes = require('./src/routes/banner.routes');
const socialMediaRoutes = require('./src/routes/socialMedia.routes');
const productsRoutes = require('./src/routes/products.routes');
const categoriesRoutes = require('./src/routes/categories.routes');
const authRoutes = require('./src/routes/auth.routes');
const tablesRoutes = require('./src/routes/tables.routes');
const statisticsRoutes = require('./src/routes/statistics.routes'); // İstatistikler router'ını ekliyoruz

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const SERVER_PORT = process.env.PORT || 3002;

// Configure QR code directory
const qrCodeDir = path.join(__dirname, 'public', 'qrcodes');

// Configure upload directory for images
const uploadDir = path.join(__dirname, 'public', 'uploads');

// Ensure directories exist
if (!fs.existsSync(qrCodeDir)) {
  fs.mkdirSync(qrCodeDir, { recursive: true });
}

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Test file system permissions
try {
  const testFilePath = path.join(uploadDir, 'test-write-permissions.txt');
  fs.writeFileSync(testFilePath, 'Test file write permissions');
  fs.unlinkSync(testFilePath);
  console.log('File system permissions verified: upload directory is writable');
} catch (error) {
  console.error('ERROR: Upload directory is not writable:', error);
}

// Configure multer storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'))); // Bu satırı ekleyin

// Database connection functions
// Check if database already exists
const checkDatabaseExists = async (connection) => {
  try {
    const dbName = process.env.DB_NAME || 'qr_menu_db';
    const [rows] = await connection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName]
    );
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking if database exists:', error);
    return false;
  }
};

// Create the database if it doesn't exist
const createDatabase = async (connection) => {
  try {
    const dbName = process.env.DB_NAME || 'qr_menu_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`Database '${dbName}' created successfully`);
    return true;
  } catch (error) {
    console.error('Error creating database:', error);
    return false;
  }
};

// Set up database connection validation and creation
const setupDatabase = async () => {
  try {
    console.log('Starting database setup...');
    console.log('Database configuration:', {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      database: process.env.DB_NAME || 'qr_menu_db',
      port: process.env.DB_PORT || 3306
    });

    // Try to connect to MySQL server without specifying a database
    let tempConnection;
    try {
      tempConnection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306
      });

      console.log('Connected to MySQL server successfully');
    } catch (connError) {
      console.error('Failed to connect to MySQL server:', connError);
      console.error('Please check your MySQL server is running and credentials are correct in .env file');
      // For development, don't exit process if DB connection fails
      console.log('Continuing without database connection for development purposes');
      return false;
    }

    // Check if database exists
    const dbExists = await checkDatabaseExists(tempConnection);

    if (!dbExists) {
      // Create database if it doesn't exist
      console.log(`Database '${process.env.DB_NAME || 'qr_menu_db'}' does not exist, creating...`);
      await createDatabase(tempConnection);

      // Close temp connection
      await tempConnection.end();

      // Initialize the database connection pool
      try {
        await db.init();
        console.log('Database connection pool initialized successfully');
      } catch (poolError) {
        console.error('Failed to initialize database connection pool:', poolError);
        return false;
      }

      // Run SQL setup scripts
      console.log('Setting up database with SQL files...');

      // Get path to SQL files
      const qrMenuDatabaseSQL = path.join(__dirname, '../qr-menu-database.sql');
      const testDataSQL = path.join(__dirname, '../test-data.sql');
      const adminUserSQL = path.join(__dirname, '../admin-user.sql');

      // Execute SQL files if they exist
      if (fs.existsSync(qrMenuDatabaseSQL)) {
        await db.executeFile(qrMenuDatabaseSQL);
      } else {
        // If SQL file doesn't exist, use the schema.js to create tables
        console.log('Using schema.js to create tables...');
        await createTables();
      }

      // Execute test data SQL file if it exists
      if (fs.existsSync(testDataSQL)) {
        await db.executeFile(testDataSQL);
      }

      // Execute admin user SQL file if it exists
      if (fs.existsSync(adminUserSQL)) {
        await db.executeFile(adminUserSQL);
      }
    } else {
      // Close temp connection
      await tempConnection.end();

      // Initialize the database connection pool
      try {
        await db.init();

        // Validate connection
        await db.query('SELECT 1');
        console.log('Connected to the existing database successfully');

        // Eğer database mevcut ise, admin kullanıcısının şifresini güncelle
        console.log('Mevcut veritabanında admin kullanıcısını kontrol ediliyor...');
        await createTables(); // Bu fonksiyon aynı zamanda admin kullanıcısı ekleme/güncelleme işlemini de yapacak
      } catch (poolError) {
        console.error('Failed to connect to existing database:', poolError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Database setup error:', error);
    console.error('The application cannot start without a proper database connection');
    return false;
  }
};

// ROUTES
// =====================

// API Info Route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'QR Menu API is running',
    version: '1.0.0'
  });
});

// Route handlers for module routes
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/waiter-calls', waiterCallRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/statistics', statisticsRoutes); // İstatistikler için route'u ekliyoruz

// Helper function to generate QR code
async function generateQrCodeForTable(tableId, tableNumber) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const tableUrl = `${baseUrl}/menu?table=${tableId}`;

  // Create directory if not exists
  if (!fs.existsSync(qrCodeDir)) {
    fs.mkdirSync(qrCodeDir, { recursive: true });
  }

  // Generate QR code file name
  const fileName = `table_${tableId}_${Date.now()}.png`;
  const filePath = path.join(qrCodeDir, fileName);

  // Generate QR code
  await qr.toFile(filePath, tableUrl, {
    color: {
      dark: '#000000',
      light: '#ffffff'
    },
    width: 300,
    margin: 1
  });

  // Return the public URL to the QR code
  return `/qrcodes/${fileName}`;
}

// Start server
const startServer = async () => {
  // Attempt to set up the database but don't let it stop server startup
  await setupDatabase().catch(err => {
    console.error('Database setup failed, but server will continue:', err);
  });

  app.listen(SERVER_PORT, () => {
    console.log(`Server running on port ${SERVER_PORT}`);
  });
};

startServer();
