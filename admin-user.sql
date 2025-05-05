-- Admin kullanıcılarını oluştur
USE qr_menu_db;

-- Admin kullanıcısı (şifre: admin123)
INSERT INTO users (username, email, password, first_name, last_name, role, is_active)
VALUES ('admin', 'admin@example.com', '$2b$10$3euPiuKgmPnpGUQxk2n3iOzQ1XvZOWl99gDN2BivIGM9TnL9lGpQa', 'Admin', 'User', 'admin', 1);

-- Editor kullanıcısı (şifre: editor123)
INSERT INTO users (username, email, password, first_name, last_name, role, is_active)
VALUES ('editor', 'editor@example.com', '$2b$10$8Z3ifhQxqfHMGmzGxA9WLeCKKLNFZX7mA8nKmHApjAhGEPeE3y95O', 'Editor', 'User', 'editor', 1);

-- Manager kullanıcısı (şifre: manager123)
INSERT INTO users (username, email, password, first_name, last_name, role, is_active)
VALUES ('manager', 'manager@example.com', '$2b$10$o.v6VnRc9Mt9vlhBqVJ1H.5bO1VJHvXoECM8kGQjfxfbSW9E3cRv.', 'Manager', 'User', 'manager', 1);

-- Waiter kullanıcısı (şifre: waiter123)
INSERT INTO users (username, email, password, first_name, last_name, role, is_active)
VALUES ('waiter', 'waiter@example.com', '$2b$10$8Z3ifhQxqfHMGmzGxA9WLeCKKLNFZX7mA8nKmHApjAhGEPeE3y95O', 'Waiter', 'User', 'waiter', 1);
