# QR Menü Sistemi

Bu proje, restoran müşterilerinin QR kodları tarayarak menüleri görüntülemesini, sipariş vermesini ve garson çağırmasını sağlayan bir sistem sunar. Admin paneli üzerinden ürünleri, kategorileri, siparişleri ve site ayarlarını yönetebilirsiniz.

## Proje Yapısı

Proje iki ana bölümden oluşur:

1. **Frontend (qr-menu-frontend)**: React ve TypeScript kullanılarak geliştirilmiş kullanıcı arayüzü.
2. **Backend (qr-menu-backend)**: Node.js, Express ve MySQL kullanılarak geliştirilmiş API sunucusu.

## Gereksinimler

- Node.js v14 veya daha yüksek
- MySQL 5.7 veya daha yüksek
- Bun (paket yöneticisi olarak kullanılmıştır, npm de kullanılabilir)

## Kurulum

### Backend Kurulumu

1. Backend dizinine gidin:
```bash
cd qr-menu-backend
```

2. Bağımlılıkları yükleyin:
```bash
npm install
# veya
bun install
```

3. `.env` dosyasını düzenleyin:
```
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=şifreniz
DB_NAME=qr_menu_db
DB_PORT=3306

# Server Configuration
PORT=3002

# JWT Configuration
JWT_SECRET=kendi-gizli-anahtarınız

# CORS Configuration
CORS_ORIGIN=*

# Frontend URL for QR Codes
FRONTEND_URL=http://localhost:5173

# Upload Configuration
UPLOAD_DIR=public/uploads
```

4. Veritabanını oluşturun:
```bash
mysql -u root -p < qr-menu-database.sql
```

5. Sunucuyu başlatın:
```bash
node server.js
# veya
bun run start
```

### Frontend Kurulumu

1. Frontend dizinine gidin:
```bash
cd qr-menu-frontend
```

2. Bağımlılıkları yükleyin:
```bash
npm install
# veya
bun install
```

3. `.env` dosyasını düzenleyin:
```
VITE_API_URL=http://localhost:3002/api
```

4. Geliştirme sunucusunu başlatın:
```bash
npm run dev
# veya
bun run dev
```

## Kullanım

- **Müşteri Arayüzü**: http://localhost:5173 adresinden erişilebilir.
- **Admin Paneli**: http://localhost:5173/login adresinden giriş yapabilirsiniz.
  - Varsayılan kullanıcı adı: `admin`
  - Varsayılan şifre: `admin123`

## Proje Özellikleri

### Müşteri Özellikleri
- QR kod tarama ile menüye erişim
- Kategorilere göre ürünleri filtreleme
- Ürün detaylarını görüntüleme ve sipariş sepetine ekleme
- Garson çağırma
- Geri bildirim gönderme

### Admin Özellikleri
- Kategorileri yönetme (ekleme, düzenleme, silme)
- Ürünleri yönetme (ekleme, düzenleme, silme)
- Siparişleri görüntüleme ve durumlarını güncelleme
- Garson çağrılarını görüntüleme
- Masa QR kodlarını oluşturma ve yazdırma
- Site ayarlarını yönetme (logo, isim, iletişim bilgileri vb.)

## Teknik Detaylar

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Veritabanı**: MySQL
- **Kimlik Doğrulama**: JWT tabanlı

## Sorun Giderme

### API Bağlantı Sorunları
- Backend sunucusunun çalıştığından emin olun
- `.env` dosyalarındaki ayarları kontrol edin
- CORS ayarlarını kontrol edin

### Veritabanı Sorunları
- MySQL sunucusunun çalıştığından emin olun
- Kullanıcı izinlerini kontrol edin
- Şemayı doğru şekilde oluşturduğunuzdan emin olun

## Lisans

Bu proje [MIT lisansı](LICENSE) altında lisanslanmıştır.
