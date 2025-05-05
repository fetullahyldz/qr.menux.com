-- Test verileri için SQL
USE qr_menu_db;

-- Kategoriler için test verileri
INSERT INTO categories (name, description, image_url, is_active, sort_order, product_count)
VALUES
('Ana Yemekler', 'Restoranımızın en sevilen ana yemekleri', 'https://via.placeholder.com/150?text=Ana+Yemekler', 1, 1, 0),
('İçecekler', 'Soğuk ve sıcak içecekler', 'https://via.placeholder.com/150?text=İçecekler', 1, 2, 0),
('Tatlılar', 'Günlük taze hazırlanan tatlılarımız', 'https://via.placeholder.com/150?text=Tatlılar', 1, 3, 0),
('Çorbalar', 'Geleneksel Türk çorbaları', 'https://via.placeholder.com/150?text=Çorbalar', 1, 4, 0);

-- Ürünler için test verileri
INSERT INTO products (category_id, name, description, price, image_url, is_active, sort_order)
VALUES
(1, 'Köfte', 'İzgara köfte, yanında pilav ve salata ile', 85.00, 'https://via.placeholder.com/150?text=Köfte', 1, 1 , 0),
(1, 'Tavuk Şiş', 'Özel marine edilmiş tavuk şiş', 75.00, 'https://via.placeholder.com/150?text=Tavuk+Şiş', 1, 2 , 0),
(2, 'Ayran', 'Ev yapımı ayran', 15.00, 'https://via.placeholder.com/150?text=Ayran', 1, 1 , 0),
(2, 'Çay', 'Demli çay', 10.00, 'https://via.placeholder.com/150?text=Çay', 1, 2 ,0),
(3, 'Baklava', 'Fıstıklı baklava', 45.00, 'https://via.placeholder.com/150?text=Baklava', 1, 1,0),
(3, 'Sütlaç', 'Ev yapımı fırın sütlaç', 35.00, 'https://via.placeholder.com/150?text=Sütlaç', 1, 2,0),
(4, 'Mercimek Çorbası', 'Geleneksel mercimek çorbası', 30.00, 'https://via.placeholder.com/150?text=Mercimek', 1, 1,0),
(4, 'Ezogelin Çorbası', 'Ezogelin çorbası', 30.00, 'https://via.placeholder.com/150?text=Ezogelin', 1, 2,0);

-- Ürün seçenekleri ekle
INSERT INTO product_options (product_id, name, price_modifier, is_required, sort_order) VALUES
(1, 'Az Pişmiş', 0, 0, 1),
(1, 'Orta Pişmiş', 0, 0, 2),
(1, 'İyi Pişmiş', 0, 0, 3),
(2, 'Acılı', 0, 0, 1),
(2, 'Acısız', 0, 0, 2);

-- Ürün sayılarını güncelle
UPDATE categories c
SET product_count = (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1)
WHERE c.id > 0;

-- Masalar için test verileri
INSERT INTO restaurant_tables (table_number, qr_code_url, is_active, status)
VALUES
('Masa 1', 'https://via.placeholder.com/150?text=QR1', 1, 'available'),
('Masa 2', 'https://via.placeholder.com/150?text=QR2', 1, 'available'),
('Masa 3', 'https://via.placeholder.com/150?text=QR3', 1, 'occupied'),
('Masa 4', 'https://via.placeholder.com/150?text=QR4', 1, 'reserved'),
('Masa 5', 'https://via.placeholder.com/150?text=QR5', 1, 'available');

-- Site ayarları için test verileri
INSERT INTO site_settings (setting_key, setting_value, setting_type, is_public)
VALUES
('restaurant_name', 'QR Menü Restoran', 'text', 1),
('restaurant_slogan', 'Lezzetin Adresi', 'text', 1),
('restaurant_description', 'Türk ve dünya mutfağından seçkin lezzetler', 'text', 1),
('restaurant_address', 'Örnek Caddesi No:123, İstanbul', 'text', 1),
('restaurant_phone', '+90 (212) 123 4567', 'text', 1),
('restaurant_email', 'info@qrmenu.com', 'text', 1),
('working_hours_weekdays', '09:00 - 22:00', 'text', 1),
('working_hours_weekends', '10:00 - 23:00', 'text', 1);

-- Banner ekle
INSERT INTO banners (title, subtitle, image_url, button_text, button_link, display_order, is_active)
VALUES
('Hoş Geldiniz', 'QR Menü Restoran', 'https://via.placeholder.com/1200x400?text=Banner+1', 'Menüyü İncele', '/menu', 1, 1),
('Yeni Lezzetler', 'Özel Günlere Özel Seçenekler', 'https://via.placeholder.com/1200x400?text=Banner+2', 'İletişime Geç', '/contact', 2, 1);

-- Sosyal medya linkleri ekle
INSERT INTO social_media (platform, url, icon, display_order, is_active)
VALUES
('Facebook', 'https://facebook.com/qrmenu', 'facebook', 1, 1),
('Instagram', 'https://instagram.com/qrmenu', 'instagram', 2, 1),
('Twitter', 'https://twitter.com/qrmenu', 'twitter', 3, 1);

-- Admin kullanıcısı
INSERT INTO users (username, email, password, full_name, role, is_active)
VALUES
('admin', 'admin@example.com', '$2b$10$o.v6VnRc9Mt9vlhBqVJ1H.5bO1VJHvXoECM8kGQjfxfbSW9E3cRv.', 'Admin User', 'admin', 1);
-- Not: password = 'admin123' (bcrypt ile hashlendi)

-- Test için diller
INSERT INTO languages (code, name, native_name, flag_code, is_default, is_active)
VALUES
('tr', 'Türkçe', 'Türkçe', 'tr', 1, 1),
('en', 'English', 'English', 'gb', 0, 1);
