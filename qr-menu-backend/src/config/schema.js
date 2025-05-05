// MySQL schema definition
const db = require('./db');

// Admin kullanıcı oluşturma yardımcı fonksiyonu
async function createAdminUser() {
  try {
    console.log('Admin kullanıcısı oluşturuluyor...');
    const bcrypt = require('bcrypt');

    // Şifreyi manuel olarak hash'leyelim
    const plainPassword = 'admin123';
    console.log('Admin şifresi hash\'leniyor:', plainPassword);
    const salt = await bcrypt.genSalt(10);
    console.log('Salt:', salt);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    console.log('Hash\'lenmiş şifre:', hashedPassword);

    // Önce mevcut admin kullanıcısını kontrol edelim
    const existingAdmin = await db.getOne('SELECT * FROM users WHERE username = ?', ['admin']);

    if (existingAdmin) {
      console.log('Mevcut admin kullanıcısının şifresi güncelleniyor');

      // Şifreyi güncelle
      await db.run(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, 'admin']
      );

      // Test amaçlı olarak şifreyi kontrol et
      const testPassword = await bcrypt.compare(plainPassword, hashedPassword);
      console.log('Şifre doğrulama testi:', testPassword ? 'Başarılı' : 'Başarısız');

      return existingAdmin.id;
    } else {
      console.log('Yeni admin kullanıcısı oluşturuluyor');

      // Yeni admin kullanıcısı oluştur
      const result = await db.run(
        'INSERT INTO users (username, email, password, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['admin', 'admin@example.com', hashedPassword, 'Admin', 'User', 'admin', 1]
      );

      // Test amaçlı olarak şifreyi kontrol et
      const testPassword = await bcrypt.compare(plainPassword, hashedPassword);
      console.log('Yeni şifre doğrulama testi:', testPassword ? 'Başarılı' : 'Başarısız');

      return result.insertId;
    }
  } catch (error) {
    console.error('Admin kullanıcısı oluşturma hatası:', error);
    throw error;
  }
}

// Define schemas and create tables if not exist
async function createTables() {
  try {
    console.log('Creating tables if they do not exist...');

    // Languages table
    await db.run(`
      CREATE TABLE IF NOT EXISTS languages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        native_name VARCHAR(100) NOT NULL,
        flag_code VARCHAR(10) NOT NULL,
        is_default TINYINT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Translations table
    await db.run(`
      CREATE TABLE IF NOT EXISTS translations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        language_code VARCHAR(10) NOT NULL,
        resource_key VARCHAR(255) NOT NULL,
        resource_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE(language_code, resource_key),
        FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE
      )
    `);

    // Categories table
    await db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(255),
        is_active TINYINT DEFAULT 1,
        sort_order INT DEFAULT 0,
        product_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Category translations table
    await db.run(`
      CREATE TABLE IF NOT EXISTS category_translations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        language_code VARCHAR(10) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE(category_id, language_code),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE
      )
    `);

    // Products table
    await db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image_url VARCHAR(255),
        is_active TINYINT DEFAULT 1,
        is_featured TINYINT DEFAULT 0,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);

    // Product translations table
    await db.run(`
      CREATE TABLE IF NOT EXISTS product_translations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        language_code VARCHAR(10) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE(product_id, language_code),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE
      )
    `);

    // Product options table
    await db.run(`
      CREATE TABLE IF NOT EXISTS product_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price_modifier DECIMAL(10,2) DEFAULT 0.00,
        is_active TINYINT DEFAULT 1,
        is_required TINYINT DEFAULT 0,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);

    // Option translations table
    await db.run(`
      CREATE TABLE IF NOT EXISTS option_translations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        option_id INT NOT NULL,
        language_code VARCHAR(10) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE(option_id, language_code),
        FOREIGN KEY (option_id) REFERENCES product_options(id) ON DELETE CASCADE,
        FOREIGN KEY (language_code) REFERENCES languages(code) ON DELETE CASCADE
      )
    `);

    // Users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role ENUM('admin', 'manager', 'waiter', 'chef', 'editor') DEFAULT 'waiter',
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Restaurant tables table
    await db.run(`
      CREATE TABLE IF NOT EXISTS restaurant_tables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_number VARCHAR(50) NOT NULL UNIQUE,
        qr_code_url VARCHAR(255),
        is_active TINYINT DEFAULT 1,
        status ENUM('available', 'occupied', 'reserved') DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    await db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_id INT,
        order_type ENUM('table', 'takeaway') DEFAULT 'table',
        status ENUM('new', 'processing', 'ready', 'completed', 'cancelled') DEFAULT 'new',
        total_amount DECIMAL(10,2) NOT NULL,
        special_instructions TEXT,
        customer_name VARCHAR(100),
        customer_email VARCHAR(100),
        customer_phone VARCHAR(20),
        customer_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL
      )
    `);

    // Order items table
    await db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        special_instructions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
      )
    `);

    // Order item options table
    await db.run(`
      CREATE TABLE IF NOT EXISTS order_item_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_item_id INT NOT NULL,
        product_option_id INT NOT NULL,
        product_option_name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
        FOREIGN KEY (product_option_id) REFERENCES product_options(id) ON DELETE RESTRICT
      )
    `);

    // Site settings table
    await db.run(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT,
        setting_type ENUM('text', 'number', 'boolean', 'json', 'image') DEFAULT 'text',
        is_public TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Banners table
    await db.run(`
      CREATE TABLE IF NOT EXISTS banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        subtitle VARCHAR(255),
        image_url VARCHAR(255) NOT NULL,
        button_text VARCHAR(100),
        button_link VARCHAR(255),
        display_order INT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Social media table
    await db.run(`
      CREATE TABLE IF NOT EXISTS social_media (
        id INT AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(50) NOT NULL,
        url VARCHAR(255) NOT NULL,
        icon VARCHAR(50),
        display_order INT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Waiter calls table
    await db.run(`
      CREATE TABLE IF NOT EXISTS waiter_calls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_id INT NOT NULL,
        status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE
      )
    `);

    // Feedback table
    await db.run(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_id INT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        food_rating INT,
        service_rating INT,
        ambience_rating INT,
        price_rating INT,
        overall_rating INT NOT NULL,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES restaurant_tables(id) ON DELETE SET NULL
      )
    `);

    console.log('Database tables created successfully');

    // Insert default data
    await insertDefaultData();

    return true;
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

// Insert default data into the tables
async function insertDefaultData() {
  try {
    // Önce admin kullanıcısı oluştur/güncelle
    await createAdminUser();

    // Check if users table still needs more users
    const users = await db.query('SELECT COUNT(*) as count FROM users');

    if (users[0].count < 2) {
      console.log('Inserting additional users...');

      // Add editor user
      const bcrypt = require('bcrypt');
      const editorPassword = await bcrypt.hash('editor123', 10);
      await db.run(
        'INSERT INTO users (username, email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        ['editor', 'editor@example.com', editorPassword, 'Editor', 'User', 'editor']
      );
    }

    // Check if categories table is empty
    const categories = await db.query('SELECT COUNT(*) as count FROM categories');

    if (categories[0].count === 0) {
      console.log('Inserting default categories...');

      // Insert default categories
      const result1 = await db.run(
        'INSERT INTO categories (name, description, is_active, sort_order) VALUES (?, ?, ?, ?)',
        ['Ana Yemekler', 'Lezzetli ana yemeklerimiz', 1, 1]
      );

      const result2 = await db.run(
        'INSERT INTO categories (name, description, is_active, sort_order) VALUES (?, ?, ?, ?)',
        ['İçecekler', 'Serinletici içecekler', 1, 2]
      );

      const result3 = await db.run(
        'INSERT INTO categories (name, description, is_active, sort_order) VALUES (?, ?, ?, ?)',
        ['Tatlılar', 'Tatlı çeşitlerimiz', 1, 3]
      );

      // Get category IDs
      const ana_yemekler_id = result1.insertId;
      const icecekler_id = result2.insertId;
      const tatlilar_id = result3.insertId;

      // Insert sample products
      console.log('Inserting sample products...');

      // Ana Yemekler
      const kofte_result = await db.run(
        'INSERT INTO products (category_id, name, description, price, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [ana_yemekler_id, 'Izgara Köfte', 'Özel baharatlarla hazırlanmış el yapımı köftemiz', 120.00, 1, 1]
      );

      const tavuk_result = await db.run(
        'INSERT INTO products (category_id, name, description, price, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [ana_yemekler_id, 'Tavuk Şiş', 'Marine edilmiş tavuk parçaları', 100.00, 1, 2]
      );

      // İçecekler
      await db.run(
        'INSERT INTO products (category_id, name, description, price, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [icecekler_id, 'Ayran', 'Ev yapımı taze ayran', 15.00, 1, 1]
      );

      await db.run(
        'INSERT INTO products (category_id, name, description, price, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [icecekler_id, 'Kola', '330ml kutu', 20.00, 1, 2]
      );

      // Tatlılar
      await db.run(
        'INSERT INTO products (category_id, name, description, price, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [tatlilar_id, 'Kazandibi', 'Geleneksel Türk tatlısı kazandibi', 45.00, 1, 1]
      );

      await db.run(
        'INSERT INTO products (category_id, name, description, price, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [tatlilar_id, 'Sütlaç', 'Fırında pişirilmiş geleneksel sütlaç', 40.00, 1, 2]
      );

      // Add product options
      console.log('Inserting product options...');

      // Options for köfte
      await db.run(
        'INSERT INTO product_options (product_id, name, price_modifier, is_required, sort_order) VALUES (?, ?, ?, ?, ?)',
        [kofte_result.insertId, 'Az Pişmiş', 0, 0, 1]
      );

      await db.run(
        'INSERT INTO product_options (product_id, name, price_modifier, is_required, sort_order) VALUES (?, ?, ?, ?, ?)',
        [kofte_result.insertId, 'Orta Pişmiş', 0, 0, 2]
      );

      await db.run(
        'INSERT INTO product_options (product_id, name, price_modifier, is_required, sort_order) VALUES (?, ?, ?, ?, ?)',
        [kofte_result.insertId, 'İyi Pişmiş', 0, 0, 3]
      );

      // Options for tavuk
      await db.run(
        'INSERT INTO product_options (product_id, name, price_modifier, is_required, sort_order) VALUES (?, ?, ?, ?, ?)',
        [tavuk_result.insertId, 'Acılı', 0, 0, 1]
      );

      await db.run(
        'INSERT INTO product_options (product_id, name, price_modifier, is_required, sort_order) VALUES (?, ?, ?, ?, ?)',
        [tavuk_result.insertId, 'Acısız', 0, 0, 2]
      );

      // Insert sample tables
      console.log('Inserting sample tables...');

      for (let i = 1; i <= 10; i++) {
        await db.run(
          'INSERT INTO restaurant_tables (table_number, is_active, status) VALUES (?, ?, ?)',
          [`Masa ${i}`, 1, 'available']
        );
      }

      // Insert site settings
      console.log('Inserting site settings...');

      const settings = [
        { key: 'restaurant_name', value: 'Lezzet Köşesi Restoran', type: 'text', is_public: 1 },
        { key: 'restaurant_slogan', value: 'En Lezzetli Türk Mutfağı', type: 'text', is_public: 1 },
        { key: 'restaurant_description', value: 'Geleneksel Türk mutfağını modern sunum teknikleriyle buluşturuyoruz. Taze malzemelerle hazırlanan yemeklerimiz ve özel lezzetlerimizle sizleri bekliyoruz.', type: 'text', is_public: 1 },
        { key: 'phone_number', value: '+90 (212) 123 4567', type: 'text', is_public: 1 },
        { key: 'address', value: 'Örnek Mahallesi, Lezzet Caddesi No:123, İstanbul', type: 'text', is_public: 1 },
        { key: 'email', value: 'info@lezzetkosesi.com', type: 'text', is_public: 1 },
        { key: 'working_hours_weekdays', value: '09:00 - 22:00', type: 'text', is_public: 1 },
        { key: 'working_hours_weekends', value: '10:00 - 23:00', type: 'text', is_public: 1 }
      ];

      for (const setting of settings) {
        // Check if setting already exists to avoid duplicates
        const existingSetting = await db.getOne(
          'SELECT id FROM site_settings WHERE setting_key = ?',
          [setting.key]
        );

        if (!existingSetting) {
          await db.run(
            'INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public) VALUES (?, ?, ?, ?)',
            [setting.key, setting.value, setting.type, setting.is_public]
          );
        }
      }

      // Insert social media links
      console.log('Inserting social media links...');

      const socialMedia = [
        { platform: 'Facebook', url: 'https://facebook.com/qrmenu', icon: 'facebook', display_order: 1 },
        { platform: 'Instagram', url: 'https://instagram.com/qrmenu', icon: 'instagram', display_order: 2 },
        { platform: 'Twitter', url: 'https://twitter.com/qrmenu', icon: 'twitter', display_order: 3 }
      ];

      for (const social of socialMedia) {
        await db.run(
          'INSERT INTO social_media (platform, url, icon, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
          [social.platform, social.url, social.icon, social.display_order, 1]
        );
      }

      console.log('Default data inserted successfully');
    }
  } catch (error) {
    console.error('Error inserting default data:', error);
    throw error;
  }
}

module.exports = { createTables };
