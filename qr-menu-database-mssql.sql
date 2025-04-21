-- Veritabanı oluşturma
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'qr_menu_db')
BEGIN
    CREATE DATABASE qr_menu_db;
END
GO

USE qr_menu_db;
GO

-- Languages table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[languages]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[languages] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [code] NVARCHAR(10) NOT NULL UNIQUE,
        [name] NVARCHAR(100) NOT NULL,
        [native_name] NVARCHAR(100) NOT NULL,
        [flag_code] NVARCHAR(10) NOT NULL,
        [is_default] BIT DEFAULT 0,
        [is_active] BIT DEFAULT 1,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Translations table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[translations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[translations] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [language_code] NVARCHAR(10) NOT NULL,
        [resource_key] NVARCHAR(255) NOT NULL,
        [resource_value] NVARCHAR(MAX) NOT NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT UQ_translations_lang_key UNIQUE([language_code], [resource_key])
    );
END
GO

-- Categories table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[categories]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[categories] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [name] NVARCHAR(255) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [image_url] NVARCHAR(255) NULL,
        [is_active] BIT DEFAULT 1,
        [sort_order] INT DEFAULT 0,
        [product_count] INT DEFAULT 0,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Category translations table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[category_translations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[category_translations] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [category_id] INT NOT NULL,
        [language_code] NVARCHAR(10) NOT NULL,
        [name] NVARCHAR(255) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT UQ_category_translations UNIQUE([category_id], [language_code]),
        CONSTRAINT FK_category_translations_category FOREIGN KEY ([category_id]) REFERENCES [dbo].[categories]([id]) ON DELETE CASCADE
    );
END
GO

-- Products table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[products] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [category_id] INT NOT NULL,
        [name] NVARCHAR(255) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [price] DECIMAL(10,2) NOT NULL,
        [image_url] NVARCHAR(255) NULL,
        [is_active] BIT DEFAULT 1,
        [is_featured] BIT DEFAULT 0,
        [sort_order] INT DEFAULT 0,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_products_category FOREIGN KEY ([category_id]) REFERENCES [dbo].[categories]([id]) ON DELETE CASCADE
    );
END
GO

-- Product translations table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[product_translations]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[product_translations] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [product_id] INT NOT NULL,
        [language_code] NVARCHAR(10) NOT NULL,
        [name] NVARCHAR(255) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT UQ_product_translations UNIQUE([product_id], [language_code]),
        CONSTRAINT FK_product_translations_product FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE CASCADE
    );
END
GO

-- Product options table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[product_options]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[product_options] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [product_id] INT NOT NULL,
        [name] NVARCHAR(255) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [price_modifier] DECIMAL(10,2) DEFAULT 0.00,
        [is_active] BIT DEFAULT 1,
        [is_required] BIT DEFAULT 0,
        [sort_order] INT DEFAULT 0,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_product_options_product FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE CASCADE
    );
END
GO

-- Users table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[users] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [username] NVARCHAR(50) NOT NULL UNIQUE,
        [email] NVARCHAR(100) NOT NULL UNIQUE,
        [password] NVARCHAR(255) NOT NULL,
        [first_name] NVARCHAR(100) NULL,
        [last_name] NVARCHAR(100) NULL,
        [role] NVARCHAR(20) DEFAULT 'waiter',
        [is_active] BIT DEFAULT 1,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Restaurant tables table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[restaurant_tables]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[restaurant_tables] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [table_number] NVARCHAR(50) NOT NULL UNIQUE,
        [qr_code_url] NVARCHAR(255) NULL,
        [is_active] BIT DEFAULT 1,
        [status] NVARCHAR(20) DEFAULT 'available',
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Orders table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[orders]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[orders] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [table_id] INT NULL,
        [order_type] NVARCHAR(20) DEFAULT 'table',
        [status] NVARCHAR(20) DEFAULT 'new',
        [total_amount] DECIMAL(10,2) NOT NULL,
        [special_instructions] NVARCHAR(MAX) NULL,
        [customer_name] NVARCHAR(100) NULL,
        [customer_email] NVARCHAR(100) NULL,
        [customer_phone] NVARCHAR(20) NULL,
        [customer_address] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_orders_table FOREIGN KEY ([table_id]) REFERENCES [dbo].[restaurant_tables]([id])
    );
END
GO

-- Order items table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[order_items]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[order_items] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [order_id] INT NOT NULL,
        [product_id] INT NOT NULL,
        [product_name] NVARCHAR(255) NOT NULL,
        [quantity] INT NOT NULL,
        [price] DECIMAL(10,2) NOT NULL,
        [special_instructions] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_order_items_order FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE CASCADE,
        CONSTRAINT FK_order_items_product FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id])
    );
END
GO

-- Site settings table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[site_settings]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[site_settings] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [setting_key] NVARCHAR(100) NOT NULL UNIQUE,
        [setting_value] NVARCHAR(MAX) NULL,
        [setting_type] NVARCHAR(20) DEFAULT 'text',
        [is_public] BIT DEFAULT 1,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Banners table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[banners]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[banners] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [title] NVARCHAR(255) NULL,
        [subtitle] NVARCHAR(255) NULL,
        [image_url] NVARCHAR(255) NOT NULL,
        [button_text] NVARCHAR(100) NULL,
        [button_link] NVARCHAR(255) NULL,
        [display_order] INT DEFAULT 0,
        [is_active] BIT DEFAULT 1,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Social media table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[social_media]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[social_media] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [platform] NVARCHAR(50) NOT NULL,
        [url] NVARCHAR(255) NOT NULL,
        [icon] NVARCHAR(50) NULL,
        [display_order] INT DEFAULT 0,
        [is_active] BIT DEFAULT 1,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Waiter calls table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[waiter_calls]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[waiter_calls] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [table_id] INT NOT NULL,
        [status] NVARCHAR(20) DEFAULT 'pending',
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_waiter_calls_table FOREIGN KEY ([table_id]) REFERENCES [dbo].[restaurant_tables]([id]) ON DELETE CASCADE
    );
END
GO

-- Feedback table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[feedback]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[feedback] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [table_id] INT NULL,
        [name] NVARCHAR(100) NOT NULL,
        [email] NVARCHAR(100) NULL,
        [food_rating] INT NULL,
        [service_rating] INT NULL,
        [ambience_rating] INT NULL,
        [price_rating] INT NULL,
        [overall_rating] INT NOT NULL,
        [comments] NVARCHAR(MAX) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_feedback_table FOREIGN KEY ([table_id]) REFERENCES [dbo].[restaurant_tables]([id])
    );
END
GO

-- Admin kullanıcısı oluşturma
-- Hash değeri bcrypt ile oluşturulmuş 'admin123' şifresi için
IF NOT EXISTS (SELECT * FROM users WHERE username = 'admin')
BEGIN
    INSERT INTO users (username, email, password, first_name, last_name, role, is_active)
    VALUES ('admin', 'admin@example.com', '$2a$10$JohYnX8P1OaUUWXrvxXHU.3DZwvimVxtSQQk2JEPSz5Bz/jpZY16S', 'Admin', 'User', 'admin', 1);
END
GO

-- Örnek kategoriler ve ürünler
IF NOT EXISTS (SELECT * FROM categories WHERE name = 'Ana Yemekler')
BEGIN
    -- Ana Yemekler kategorisi
    INSERT INTO categories (name, description, is_active, sort_order)
    VALUES ('Ana Yemekler', 'Lezzetli ana yemeklerimiz', 1, 1);

    DECLARE @ana_yemekler_id INT;
    SET @ana_yemekler_id = SCOPE_IDENTITY();

    -- İçecekler kategorisi
    INSERT INTO categories (name, description, is_active, sort_order)
    VALUES ('İçecekler', 'Serinletici içecekler', 1, 2);

    DECLARE @icecekler_id INT;
    SET @icecekler_id = SCOPE_IDENTITY();

    -- Tatlılar kategorisi
    INSERT INTO categories (name, description, is_active, sort_order)
    VALUES ('Tatlılar', 'Tatlı çeşitlerimiz', 1, 3);

    DECLARE @tatlilar_id INT;
    SET @tatlilar_id = SCOPE_IDENTITY();

    -- Ana Yemekler ürünleri
    INSERT INTO products (category_id, name, description, price, is_active, sort_order)
    VALUES (@ana_yemekler_id, 'Izgara Köfte', 'Özel baharatlarla hazırlanmış el yapımı köftemiz', 120.00, 1, 1);

    DECLARE @kofte_id INT;
    SET @kofte_id = SCOPE_IDENTITY();

    INSERT INTO products (category_id, name, description, price, is_active, sort_order)
    VALUES (@ana_yemekler_id, 'Tavuk Şiş', 'Marine edilmiş tavuk parçaları', 100.00, 1, 2);

    DECLARE @tavuk_id INT;
    SET @tavuk_id = SCOPE_IDENTITY();

    -- İçecekler ürünleri
    INSERT INTO products (category_id, name, description, price, is_active, sort_order)
    VALUES (@icecekler_id, 'Ayran', 'Ev yapımı taze ayran', 15.00, 1, 1);

    INSERT INTO products (category_id, name, description, price, is_active, sort_order)
    VALUES (@icecekler_id, 'Kola', '330ml kutu', 20.00, 1, 2);

    -- Tatlılar ürünleri
    INSERT INTO products (category_id, name, description, price, is_active, sort_order)
    VALUES (@tatlilar_id, 'Kazandibi', 'Geleneksel Türk tatlısı kazandibi', 45.00, 1, 1);

    INSERT INTO products (category_id, name, description, price, is_active, sort_order)
    VALUES (@tatlilar_id, 'Sütlaç', 'Fırında pişirilmiş geleneksel sütlaç', 40.00, 1, 2);

    -- Ürün seçenekleri
    INSERT INTO product_options (product_id, name, price_modifier, is_required, sort_order)
    VALUES (@kofte_id, 'Az Pişmiş', 0, 0, 1);

    INSERT INTO product_options (product_id, name, price_modifier, is_required, sort_order)
    VALUES (@kofte_id, 'Orta Pişmiş', 0, 0, 2);

    INSERT INTO product_options (product_id, name, price_modifier, is_required, sort_order)
    VALUES (@kofte_id, 'İyi Pişmiş', 0, 0, 3);

    INSERT INTO product_options (product_id, name, price_modifier, is_required, sort_order)
    VALUES (@tavuk_id, 'Acılı', 0, 0, 1);

    INSERT INTO product_options (product_id, name, price_modifier, is_required, sort_order)
    VALUES (@tavuk_id, 'Acısız', 0, 0, 2);

    -- Örnek masalar
    DECLARE @i INT = 1;
    WHILE @i <= 10
    BEGIN
        INSERT INTO restaurant_tables (table_number, is_active, status)
        VALUES (CONCAT(N'Masa ', @i), 1, 'available');
        SET @i = @i + 1;
    END

    -- Örnek ayarlar
    INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public)
    VALUES ('restaurant_name', 'Lezzet Köşesi Restoran', 'text', 1);

    INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public)
    VALUES ('restaurant_slogan', 'En Lezzetli Türk Mutfağı', 'text', 1);

    INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public)
    VALUES ('restaurant_description', 'Geleneksel Türk mutfağını modern sunum teknikleriyle buluşturuyoruz. Taze malzemelerle hazırlanan yemeklerimiz ve özel lezzetlerimizle sizleri bekliyoruz.', 'text', 1);

    INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public)
    VALUES ('phone_number', '+90 (212) 123 4567', 'text', 1);

    INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public)
    VALUES ('address', 'Örnek Mahallesi, Lezzet Caddesi No:123, İstanbul', 'text', 1);

    INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public)
    VALUES ('email', 'info@lezzetkosesi.com', 'text', 1);

    INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public)
    VALUES ('working_hours_weekdays', '09:00 - 22:00', 'text', 1);

    INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public)
    VALUES ('working_hours_weekends', '10:00 - 23:00', 'text', 1);

    -- Örnek sosyal medya
    INSERT INTO social_media (platform, url, icon, display_order, is_active)
    VALUES ('Facebook', 'https://facebook.com/qrmenu', 'facebook', 1, 1);

    INSERT INTO social_media (platform, url, icon, display_order, is_active)
    VALUES ('Instagram', 'https://instagram.com/qrmenu', 'instagram', 2, 1);

    INSERT INTO social_media (platform, url, icon, display_order, is_active)
    VALUES ('Twitter', 'https://twitter.com/qrmenu', 'twitter', 3, 1);
END
GO
