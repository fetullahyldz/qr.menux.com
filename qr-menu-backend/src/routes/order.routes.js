const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');

// =================================
// ADMIN/PERSONEL ROUTES (korumalı)
// =================================

// Get all orders - sadece admin/personel için
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, table_id, start_date, end_date } = req.query;

    let query = `
      SELECT o.*, t.table_number
      FROM orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      WHERE 1=1
    `;
    const params = [];

    // Add filters if provided
    if (status) {
      if (Array.isArray(status)) {
        query += ` AND o.status IN (${status.map(() => '?').join(',')})`;
        params.push(...status);
      } else {
        query += ' AND o.status = ?';
        params.push(status);
      }
    }

    if (table_id) {
      query += ' AND o.table_id = ?';
      params.push(table_id);
    }

    if (start_date) {
      query += ' AND DATE(o.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(o.created_at) <= ?';
      params.push(end_date);
    }

    // Add ordering
    query += ' ORDER BY o.created_at DESC';

    const orders = await db.query(query, params);

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Siparişler alınamadı',
      error: error.message
    });
  }
});

// Update order status - sadece admin/personel için
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // Check if order exists
    const order = await db.getOne('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sipariş bulunamadı'
      });
    }

    // Validate status
    const validStatuses = ['new', 'processing', 'ready', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz sipariş durumu'
      });
    }

    // Use a transaction to ensure all operations are atomic
    await db.transaction(async (connection) => {
      // Update order status
      await connection.query(
        'UPDATE orders SET status = ? WHERE id = ?',
        [status, orderId]
      );

      // If status is 'completed' or 'cancelled' and the order has a table_id, update table status to 'available'
      if ((status === 'completed' || status === 'cancelled') && order.table_id) {
        await connection.query(
          'UPDATE restaurant_tables SET status = ? WHERE id = ?',
          ['available', order.table_id]
        );
      }
    });

    // Get updated order
    const updatedOrder = await db.getOne(`
      SELECT o.*, t.table_number
      FROM orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      WHERE o.id = ?
    `, [orderId]);

    res.json({
      success: true,
      message: 'Sipariş durumu başarıyla güncellendi',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Sipariş durumu güncellenirken bir hata oluştu',
      error: error.message
    });
  }
});

// Delete order - sadece admin/personel için
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const orderId = req.params.id;

    // Check if order exists
    const order = await db.getOne('SELECT * FROM orders WHERE id = ?', [orderId]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sipariş bulunamadı'
      });
    }

    // Use a transaction to ensure all operations are atomic
    await db.transaction(async (connection) => {
      // Delete order (cascade will delete order items and options)
      await connection.query('DELETE FROM orders WHERE id = ?', [orderId]);

      // If the order has a table_id, update table status to 'available'
      if (order.table_id) {
        // Check if there are other active orders for this table
        const [activeOrdersResult] = await connection.query(
          'SELECT COUNT(*) as count FROM orders WHERE table_id = ? AND id != ? AND status IN (\'new\', \'processing\', \'ready\')',
          [order.table_id, orderId]
        );

        // If no other active orders, set table status to available
        if (activeOrdersResult[0].count === 0) {
          await connection.query(
            'UPDATE restaurant_tables SET status = ? WHERE id = ?',
            ['available', order.table_id]
          );
        }
      }
    });

    res.json({
      success: true,
      message: 'Sipariş başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Sipariş silinirken bir hata oluştu',
      error: error.message
    });
  }
});

// =================================
// MÜŞTERİ ROUTES (koruma yok)
// =================================

// Get order by ID - müşteriler için, login gerektirmez
router.get('/:id', async (req, res) => {
  try {
    const orderId = req.params.id;

    // Get order
    const order = await db.getOne(`
      SELECT o.*, t.table_number
      FROM orders o
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      WHERE o.id = ?
    `, [orderId]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sipariş bulunamadı'
      });
    }

    // Get order items
    const items = await db.query(`
      SELECT oi.*, p.name as product_name, p.image_url as product_image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    // Get order item options
    for (const item of items) {
      const options = await db.query(`
        SELECT oio.*, po.name as product_option_name
        FROM order_item_options oio
        JOIN product_options po ON oio.product_option_id = po.id
        WHERE oio.order_item_id = ?
      `, [item.id]);

      item.options = options;
    }

    // Add items to order object
    order.items = items;

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Sipariş bilgileri alınamadı',
      error: error.message
    });
  }
});

// Create order - müşteriler için, login gerektirmez
router.post('/', async (req, res) => {
  try {
    const {
      table_id,
      order_type,
      status,
      total_amount,
      special_instructions,
      customer_name,
      customer_email,
      customer_phone,
      customer_address,
      items
    } = req.body;

    console.log('Sipariş isteği alındı:', {
      tableId: table_id,
      orderType: order_type,
      totalAmount: total_amount,
      itemCount: items?.length
    });

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sipariş öğeleri gereklidir'
      });
    }

    // Validate total_amount
    if (total_amount === undefined || total_amount === null) {
      return res.status(400).json({
        success: false,
        message: 'Toplam tutar gereklidir'
      });
    }

    // Validate table_id or order_type is takeaway
    if (!table_id && (!order_type || order_type !== 'takeaway')) {
      return res.status(400).json({
        success: false,
        message: 'Masa ID veya paket sipariş tipi gereklidir'
      });
    }

    try {
      // Use a transaction to ensure all operations are atomic
      const orderId = await db.transaction(async (connection) => {
        const orderType = order_type || 'table';

        // If table_id is provided and order_type is 'table', update table status
        if (table_id && orderType === 'table') {
          try {
            // Check if table exists
            const [tableResult] = await connection.query(
              'SELECT * FROM restaurant_tables WHERE id = ?',
              [table_id]
            );

            if (tableResult.length === 0) {
              throw new Error('Geçersiz masa ID');
            }

            // Update table status to occupied
            await connection.query(
              'UPDATE restaurant_tables SET status = ? WHERE id = ?',
              ['occupied', table_id]
            );
          } catch (tableError) {
            console.error('Masa güncellenirken hata:', tableError);
            throw new Error(`Masa işlemi başarısız: ${tableError.message}`);
          }
        }

        try {
          // Insert order
          const [orderResult] = await connection.query(
            `INSERT INTO orders (
              table_id, order_type, status, total_amount, special_instructions,
              customer_name, customer_email, customer_phone, customer_address
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              table_id || null,
              orderType,
              status || 'new',
              parseFloat(total_amount) || 0,
              special_instructions || null,
              customer_name || null,
              customer_email || null,
              customer_phone || null,
              customer_address || null
            ]
          );

          const newOrderId = orderResult.insertId;
          console.log(`Yeni sipariş oluşturuldu ID: ${newOrderId}`);

          // Insert order items
          for (const item of items) {
            try {
              console.log(`Ürün ekleniyor, ID: ${item.product_id}`);

              // Check if product exists
              const [productResult] = await connection.query(
                'SELECT * FROM products WHERE id = ?',
                [item.product_id]
              );

              if (productResult.length === 0) {
                throw new Error(`Ürün ID ${item.product_id} bulunamadı`);
              }

              const product = productResult[0];

              // Insert order item
              const [orderItemResult] = await connection.query(
                `INSERT INTO order_items (
                  order_id, product_id, product_name, quantity, price, special_instructions
                )
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  newOrderId,
                  item.product_id,
                  product.name,
                  item.quantity || 1,
                  parseFloat(item.price) || product.price,
                  item.special_instructions || null
                ]
              );

              const orderItemId = orderItemResult.insertId;
              console.log(`Sipariş öğesi eklendi ID: ${orderItemId}`);

              // Insert order item options if provided
              if (item.options && Array.isArray(item.options) && item.options.length > 0) {
                console.log(`${item.options.length} seçenek ekleniyor`);

                for (const option of item.options) {
                  try {
                    // Check if product option exists
                    const [optionResult] = await connection.query(
                      'SELECT * FROM product_options WHERE id = ?',
                      [option.product_option_id]
                    );

                    if (optionResult.length === 0) {
                      throw new Error(`Ürün seçeneği ID ${option.product_option_id} bulunamadı`);
                    }

                    const productOption = optionResult[0];

                    // Insert order item option
                    await connection.query(
                      `INSERT INTO order_item_options (
                        order_item_id, product_option_id, product_option_name, price
                      )
                      VALUES (?, ?, ?, ?)`,
                      [
                        orderItemId,
                        option.product_option_id,
                        productOption.name,
                        parseFloat(option.price_modifier) || productOption.price_modifier
                      ]
                    );
                  } catch (optionError) {
                    console.error(`Seçenek eklenirken hata, ürün opsiyonu ID: ${option.product_option_id}:`, optionError);
                    throw new Error(`Seçenek eklenirken hata: ${optionError.message}`);
                  }
                }
              }
            } catch (itemError) {
              console.error(`Sipariş öğesi eklenirken hata, ürün ID: ${item.product_id}:`, itemError);
              throw new Error(`Sipariş öğesi eklenirken hata: ${itemError.message}`);
            }
          }

          return newOrderId;
        } catch (orderError) {
          console.error('Sipariş oluşturulurken hata:', orderError);
          throw new Error(`Sipariş oluşturulurken hata: ${orderError.message}`);
        }
      });

      // Get created order with all details
      const order = await db.getOne(`
        SELECT o.*, t.table_number
        FROM orders o
        LEFT JOIN restaurant_tables t ON o.table_id = t.id
        WHERE o.id = ?
      `, [orderId]);

      // Get order items
      const orderItems = await db.query(`
        SELECT oi.*, p.name as product_name, p.image_url as product_image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [orderId]);

      // Get order item options for each item
      for (const item of orderItems) {
        const options = await db.query(`
          SELECT oio.*, po.name as product_option_name
          FROM order_item_options oio
          JOIN product_options po ON oio.product_option_id = po.id
          WHERE oio.order_item_id = ?
        `, [item.id]);

        item.options = options;
      }

      // Add items to order object
      order.items = orderItems;

      res.status(201).json({
        success: true,
        message: 'Sipariş başarıyla oluşturuldu',
        data: order
      });
    } catch (transactionError) {
      console.error('Sipariş transaction hatası:', transactionError);
      return res.status(500).json({
        success: false,
        message: `Sipariş işlemi başarısız: ${transactionError.message}`,
        error: transactionError.message
      });
    }
  } catch (error) {
    console.error('Sipariş oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sipariş oluşturma başarısız oldu',
      error: error.message
    });
  }
});

module.exports = router;
