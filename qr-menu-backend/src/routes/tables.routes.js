const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');
const qr = require('qrcode');
const fs = require('fs');
const path = require('path');

// QR kodları için dizin
const qrCodeDir = path.join(__dirname, '../../public/qrcodes');

// Dizinin var olduğundan emin ol
if (!fs.existsSync(qrCodeDir)) {
  fs.mkdirSync(qrCodeDir, { recursive: true });
}

// Masa için QR kodu oluştur
async function generateQrCodeForTable(tableId, tableNumber, req) {
  try {
    console.log('generateQrCodeForTable called with:', { tableId, tableNumber });

    // Dinamik olarak baseUrl oluştur
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    console.log('baseUrl:', baseUrl);
    const frontUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const tableUrl = `${frontUrl}/menu?table=${tableId}`;
    console.log('tableUrl:', tableUrl);

    // QR kodu dosya adı
    const fileName = `table_${tableId}_${Date.now()}.png`;
    const filePath = path.join(qrCodeDir, fileName);
    console.log('filePath:', filePath);

    // QR kodu oluştur
    console.log('Generating QR code...');
    await qr.toFile(filePath, tableUrl, {
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      width: 300,
      margin: 1,
    });

    // Dosyanın oluşturulduğunu doğrula
    if (!fs.existsSync(filePath)) {
      console.error('QR code file was not created at:', filePath);
      throw new Error('QR kodu dosyası oluşturulamadı');
    }
    console.log('QR code file created successfully at:', filePath);

    // Tam QR kodu URL'sini döndür
    const qrCodeUrl = `${baseUrl}/qrcodes/${fileName}`;
    console.log('Returning QR code URL:', qrCodeUrl);
    return qrCodeUrl;
  } catch (error) {
    console.error('QR kodu oluşturma hatası:', error);
    throw error;
  }
}

// Tüm masaları getir
router.get('/', async (req, res) => {
  try {
    let query = 'SELECT * FROM restaurant_tables';
    const params = [];
    const conditions = [];

    // Status filtresi
    if (req.query.status && req.query.status !== 'all') {
      if (!['available', 'occupied', 'reserved'].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz durum filtresi. Kabul edilen değerler: available, occupied, reserved',
        });
      }
      conditions.push('status = ?');
      params.push(req.query.status);
    }

    // Sadece aktif masaları getir (opsiyonel parametre)
    if (req.query.is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(req.query.is_active === 'true' || req.query.is_active === '1' ? 1 : 0);
    }

    // WHERE koşullarını ekle
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Sıralama ekle
    query += ' ORDER BY table_number';

    console.log('Executing query:', query, 'with params:', params);
    const tables = await db.query(query, params);

    res.json({
      success: true,
      data: tables,
    });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({
      success: false,
      message: 'Masalar alınamadı',
      error: error.message,
    });
  }
});

// ID'ye göre masa getir
router.get('/:id', async (req, res) => {
  try {
    const tableId = req.params.id;
    const table = await db.getOne('SELECT * FROM restaurant_tables WHERE id = ?', [tableId]);

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Masa bulunamadı',
      });
    }

    res.json({
      success: true,
      data: table,
    });
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({
      success: false,
      message: 'Masa bilgileri alınamadı',
      error: error.message,
    });
  }
});

// QR kodunu getir
router.get('/:id/qr-code', async (req, res) => {
  try {
    const tableId = req.params.id;
    console.log(`GET /api/tables/${tableId}/qr-code called`);

    // Masayı veritabanından getir
    const table = await db.getOne('SELECT * FROM restaurant_tables WHERE id = ?', [tableId]);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Masa bulunamadı',
      });
    }

    // QR kodu URL'sini döndür
    if (!table.qr_code_url) {
      return res.status(404).json({
        success: false,
        message: 'Bu masa için QR kodu bulunamadı',
      });
    }

    res.json({
      success: true,
      data: {
        qr_code_url: table.qr_code_url,
      },
    });
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'QR kodu alınamadı',
      error: error.message,
    });
  }
});

// Yeni QR kodu oluştur
router.post('/:id/qr-code', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const tableId = req.params.id;
    const { table_number } = req.body;
    console.log(`POST /api/tables/${tableId}/qr-code called`);

    // Masayı veritabanından getir
    const table = await db.getOne('SELECT * FROM restaurant_tables WHERE id = ?', [tableId]);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Masa bulunamadı',
      });
    }

    // Yeni QR kodu oluştur
    const qrCodeUrl = await generateQrCodeForTable(tableId, table_number || table.table_number, req);

    // Eski QR kodu dosyasını sil (varsa)
    if (table.qr_code_url) {
      const oldQrCodePath = path.join(
        __dirname,
        '../../public',
        table.qr_code_url.replace(process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`, '')
      );
      if (fs.existsSync(oldQrCodePath)) {
        fs.unlinkSync(oldQrCodePath);
        console.log('Old QR code deleted:', oldQrCodePath);
      }
    }

    // QR kod URL'sini güncelle
    await db.run('UPDATE restaurant_tables SET qr_code_url = ? WHERE id = ?', [qrCodeUrl, tableId]);
    console.log('QR code URL updated in database:', qrCodeUrl);

    res.json({
      success: true,
      message: 'QR kodu başarıyla oluşturuldu',
      data: {
        qr_code_url: qrCodeUrl,
      },
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'QR kodu oluşturma başarısız oldu',
      error: error.message,
    });
  }
});

// Yeni masa oluştur
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const { table_number, is_active, status } = req.body;

    // Masa numarasının gerekli olduğunu doğrula
    if (!table_number) {
      return res.status(400).json({
        success: false,
        message: 'Masa numarası gereklidir',
      });
    }

    // Masa numarasının zaten kullanılmadığını kontrol et
    const existingTable = await db.getOne('SELECT id FROM restaurant_tables WHERE table_number = ?', [
      table_number,
    ]);
    if (existingTable) {
      return res.status(400).json({
        success: false,
        message: 'Bu masa numarası zaten kullanılıyor',
      });
    }

    // Masayı oluştur
    const result = await db.run(
      'INSERT INTO restaurant_tables (table_number, is_active, status) VALUES (?, ?, ?)',
      [table_number, is_active === false || is_active === 'false' ? 0 : 1, status || 'available']
    );

    const tableId = result.insertId;

    // Masa için QR kodu oluştur
    const qrCodeUrl = await generateQrCodeForTable(tableId, table_number, req);

    // QR kod URL'sini güncelle
    await db.run('UPDATE restaurant_tables SET qr_code_url = ? WHERE id = ?', [qrCodeUrl, tableId]);

    // Oluşturulan masayı getir
    const newTable = await db.getOne('SELECT * FROM restaurant_tables WHERE id = ?', [tableId]);

    res.status(201).json({
      success: true,
      message: 'Masa başarıyla oluşturuldu',
      data: newTable,
    });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({
      success: false,
      message: 'Masa oluşturma başarısız oldu',
      error: error.message,
    });
  }
});

// Masayı güncelle
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const tableId = req.params.id;
    const { table_number, is_active, status, regenerate_qr } = req.body;

    // Masanın var olduğunu kontrol et
    const table = await db.getOne('SELECT * FROM restaurant_tables WHERE id = ?', [tableId]);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Masa bulunamadı',
      });
    }

    // Masa numarası değiştiyse, benzersiz olduğunu kontrol et
    if (table_number && table_number !== table.table_number) {
      const existingTable = await db.getOne(
        'SELECT id FROM restaurant_tables WHERE table_number = ? AND id != ?',
        [table_number, tableId]
      );
      if (existingTable) {
        return res.status(400).json({
          success: false,
          message: 'Bu masa numarası zaten kullanılıyor',
        });
      }
    }

    // Güncellenecek alanları hazırla
    let sql = 'UPDATE restaurant_tables SET ';
    const params = [];
    const updates = [];

    if (table_number) {
      updates.push('table_number = ?');
      params.push(table_number);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active === false || is_active === 'false' ? 0 : 1);
    }

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    // QR kodunu yeniden oluştur
    if (regenerate_qr === true || regenerate_qr === 'true') {
      const newQrCodeUrl = await generateQrCodeForTable(tableId, table_number || table.table_number, req);
      updates.push('qr_code_url = ?');
      params.push(newQrCodeUrl);
    }

    // Güncellenecek alan yoksa hata döndür
    if (updates.length === 0) {
      return res.json({
        success: true,
        message: 'Güncellenecek bilgi bulunamadı',
        data: table,
      });
    }

    // SQL sorgusunu tamamla
    sql += updates.join(', ') + ' WHERE id = ?';
    params.push(tableId);

    // Masayı güncelle
    await db.run(sql, params);

    // Güncellenmiş masayı getir
    const updatedTable = await db.getOne('SELECT * FROM restaurant_tables WHERE id = ?', [tableId]);

    res.json({
      success: true,
      message: 'Masa başarıyla güncellendi',
      data: updatedTable,
    });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({
      success: false,
      message: 'Masa güncellenirken bir hata oluştu',
      error: error.message,
    });
  }
});

// Masayı sil
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const tableId = req.params.id;

    // Masanın var olduğunu kontrol et
    const table = await db.getOne('SELECT * FROM restaurant_tables WHERE id = ?', [tableId]);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Masa bulunamadı',
      });
    }

    // Masa ile ilişkili kaydedilmiş siparişleri kontrol et
    const activeOrders = await db.getOne(
      'SELECT COUNT(*) as count FROM orders WHERE table_id = ? AND status NOT IN (\'completed\', \'cancelled\')',
      [tableId]
    );

    if (activeOrders && activeOrders.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu masa için aktif siparişler var. Önce bu siparişleri tamamlayın veya iptal edin.',
      });
    }

    // Masayı sil
    await db.run('DELETE FROM restaurant_tables WHERE id = ?', [tableId]);

    // Eski QR kodu dosyasını sil
    if (table.qr_code_url) {
      const qrCodePath = path.join(__dirname, '../../public', table.qr_code_url);
      if (fs.existsSync(qrCodePath)) {
        fs.unlinkSync(qrCodePath);
      }
    }

    res.json({
      success: true,
      message: 'Masa başarıyla silindi',
    });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({
      success: false,
      message: 'Masa silinirken bir hata oluştu',
      error: error.message,
    });
  }
});

// Masanın durumunu güncelle
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const tableId = req.params.id;
    const { status } = req.body;

    // Durum parametresini doğrula
    if (!status || !['available', 'occupied', 'reserved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir durum belirtilmelidir (available, occupied, reserved)',
      });
    }

    // Masanın var olduğunu kontrol et
    const table = await db.getOne('SELECT * FROM restaurant_tables WHERE id = ?', [tableId]);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Masa bulunamadı',
      });
    }

    // Masanın durumunu güncelle
    await db.run('UPDATE restaurant_tables SET status = ? WHERE id = ?', [status, tableId]);

    // Güncellenmiş masayı getir
    const updatedTable = await db.getOne('SELECT * FROM restaurant_tables WHERE id = ?', [tableId]);

    res.json({
      success: true,
      message: 'Masa durumu başarıyla güncellendi',
      data: updatedTable,
    });
  } catch (error) {
    console.error('Update table status error:', error);
    res.status(500).json({
      success: false,
      message: 'Masa durumu güncellenirken bir hata oluştu',
      error: error.message,
    });
  }
});

module.exports = router;