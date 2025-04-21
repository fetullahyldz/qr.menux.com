-- site_settings tablosunu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(50) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type ENUM('text', 'number', 'boolean', 'json', 'image') DEFAULT 'text',
  is_public TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Eğer ayar yoksa varsayılan ayarları ekle
INSERT IGNORE INTO site_settings (setting_key, setting_value, setting_type, is_public) VALUES
('restaurant_name', 'Lezzet Köşesi Restoran', 'text', 1),
('restaurant_slogan', 'En Lezzetli Türk Mutfağı', 'text', 1),
('restaurant_description', 'Geleneksel Türk mutfağını modern sunum teknikleriyle buluşturuyoruz. Taze malzemelerle hazırlanan yemeklerimiz ve özel lezzetlerimizle sizleri bekliyoruz.', 'text', 1),
('restaurant_logo', '/uploads/default-logo.png', 'image', 1),
('phone_number', '+90 (212) 123 4567', 'text', 1),
('address', 'Örnek Mahallesi, Lezzet Caddesi No:123, İstanbul', 'text', 1),
('email', 'info@lezzetkosesi.com', 'text', 1),
('working_hours_weekdays', '09:00 - 22:00', 'text', 1),
('working_hours_weekends', '10:00 - 23:00', 'text', 1);

-- Ayarları alabilmek için test sorgusu
SELECT * FROM site_settings WHERE is_public = 1;
