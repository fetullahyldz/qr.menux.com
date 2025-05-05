const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth.middleware');

// Get dashboard statistics for admin home page
router.get('/dashboard', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    // Get total orders count
    const totalOrders = await db.getOne(`
      SELECT COUNT(*) AS count FROM orders
    `);

    // Get today's sales
    const todaySales = await db.getOne(`
      SELECT IFNULL(SUM(total_amount), 0) AS total
      FROM orders
      WHERE DATE(created_at) = CURDATE()
      AND status NOT IN ('cancelled')
    `);

    // Get active waiter calls
    const activeWaiterCalls = await db.getOne(`
      SELECT COUNT(*) AS count
      FROM waiter_calls
      WHERE status = 'pending'
    `);

    // Get active tables count
    const activeTables = await db.getOne(`
      SELECT COUNT(*) AS count
      FROM restaurant_tables
      WHERE is_active = 1
    `);

    // Return all statistics
    res.json({
      success: true,
      data: {
        totalOrders: totalOrders ? Number(totalOrders.count) : 0,
        todaySales: todaySales ? Number(todaySales.total) : 0,
        activeWaiterCalls: activeWaiterCalls ? Number(activeWaiterCalls.count) : 0,
        activeTables: activeTables ? Number(activeTables.count) : 0
      }
    });
  } catch (error) {
    console.error('Dashboard statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınamadı',
      error: error.message
    });
  }
});

// Get recent orders for admin dashboard
router.get('/recent-orders', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const limit = req.query.limit || 10;

    // Get recent orders with table information
    const recentOrders = await db.query(`
      SELECT o.id, o.table_id, rt.table_number, o.status, o.total_amount, o.created_at
      FROM orders o
      LEFT JOIN restaurant_tables rt ON o.table_id = rt.id
      ORDER BY o.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // Ensure numeric values
    const formattedOrders = recentOrders.map(order => ({
      ...order,
      total_amount: Number(order.total_amount)
    }));

    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('Recent orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Son siparişler alınamadı',
      error: error.message
    });
  }
});

// Get sales statistics for a specific period
router.get('/sales', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const period = req.query.period || 'week'; // Options: day, week, month, year
    let dateFormat, groupBy, whereClause;

    // Set date format and group by based on period
    switch (period) {
      case 'day':
        dateFormat = "DATE_FORMAT(created_at, '%Y-%m-%d %H')";
        groupBy = "DATE_FORMAT(created_at, '%Y-%m-%d %H')";
        whereClause = "created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)";
        break;
      case 'week':
        dateFormat = "DATE_FORMAT(created_at, '%Y-%m-%d')";
        groupBy = "DATE_FORMAT(created_at, '%Y-%m-%d')";
        whereClause = "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        break;
      case 'month':
        dateFormat = "DATE_FORMAT(created_at, '%Y-%m-%d')";
        groupBy = "DATE_FORMAT(created_at, '%Y-%m-%d')";
        whereClause = "created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        break;
      case 'year':
        dateFormat = "DATE_FORMAT(created_at, '%Y-%m')";
        groupBy = "DATE_FORMAT(created_at, '%Y-%m')";
        whereClause = "created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
        break;
      default:
        dateFormat = "DATE_FORMAT(created_at, '%Y-%m-%d')";
        groupBy = "DATE_FORMAT(created_at, '%Y-%m-%d')";
        whereClause = "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    }

    // Get sales data
    const salesData = await db.query(`
      SELECT
        ${dateFormat} AS date,
        COUNT(*) AS orders,
        IFNULL(SUM(total_amount), 0) AS revenue
      FROM orders
      WHERE ${whereClause} AND status NOT IN ('cancelled')
      GROUP BY ${groupBy}
      ORDER BY date
    `);

    // Ensure numeric values for salesData
    const formattedSalesData = salesData.map(item => ({
      ...item,
      orders: Number(item.orders),
      revenue: Number(item.revenue)
    }));

    // For weekly data, organize by day of week
    if (period === 'week') {
      // Get sales for each day of the week with Turkish day names
      const weeklyData = await db.query(`
        SELECT
          CASE DAYNAME(created_at)
            WHEN 'Monday' THEN 'Pazartesi'
            WHEN 'Tuesday' THEN 'Salı'
            WHEN 'Wednesday' THEN 'Çarşamba'
            WHEN 'Thursday' THEN 'Perşembe'
            WHEN 'Friday' THEN 'Cuma'
            WHEN 'Saturday' THEN 'Cumartesi'
            WHEN 'Sunday' THEN 'Pazar'
            ELSE DAYNAME(created_at)
          END AS day_name,
          COUNT(*) AS orders,
          IFNULL(SUM(total_amount), 0) AS revenue
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status NOT IN ('cancelled')
        GROUP BY DAYNAME(created_at)
        ORDER BY
          CASE DAYNAME(created_at)
            WHEN 'Monday' THEN 1
            WHEN 'Tuesday' THEN 2
            WHEN 'Wednesday' THEN 3
            WHEN 'Thursday' THEN 4
            WHEN 'Friday' THEN 5
            WHEN 'Saturday' THEN 6
            WHEN 'Sunday' THEN 7
            ELSE 8
          END
      `);

      // Get total sales
      const totalSales = await db.getOne(`
        SELECT
          COUNT(*) AS orders,
          IFNULL(SUM(total_amount), 0) AS revenue
        FROM orders
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status NOT IN ('cancelled')
      `);

      // Ensure numeric values for weeklyData
      const formattedWeeklyData = weeklyData.map(item => ({
        ...item,
        orders: Number(item.orders),
        revenue: Number(item.revenue)
      }));

      // Calculate average order size
      const totalOrders = totalSales ? Number(totalSales.orders) : 0;
      const totalRevenue = totalSales ? Number(totalSales.revenue) : 0;
      const avgOrderSize = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return res.json({
        success: true,
        data: {
          totalOrders: totalOrders,
          totalRevenue: totalRevenue,
          avgOrderSize: avgOrderSize,
          weeklyData: formattedWeeklyData
        }
      });
    }

    res.json({
      success: true,
      data: formattedSalesData
    });
  } catch (error) {
    console.error('Sales statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Satış istatistikleri alınamadı',
      error: error.message
    });
  }
});

// Get top selling products
router.get('/top-products', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const period = req.query.period || 'month'; // day, week, month, all

    let whereClause;
    switch (period) {
      case 'day':
        whereClause = "o.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)";
        break;
      case 'week':
        whereClause = "o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        break;
      case 'month':
        whereClause = "o.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
        break;
      case 'all':
        whereClause = "1=1";
        break;
      default:
        whereClause = "o.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
    }

    const topProducts = await db.query(`
      SELECT
        p.id,
        p.name,
        COUNT(oi.id) AS order_count,
        IFNULL(SUM(oi.price * oi.quantity), 0) AS total_revenue
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE ${whereClause} AND o.status NOT IN ('cancelled')
      GROUP BY p.id, p.name
      ORDER BY order_count DESC
      LIMIT ?
    `, [parseInt(limit)]);

    // Ensure numeric values for topProducts
    const formattedTopProducts = topProducts.map(product => ({
      ...product,
      order_count: Number(product.order_count),
      total_revenue: Number(product.total_revenue)
    }));

    res.json({
      success: true,
      data: formattedTopProducts
    });
  } catch (error) {
    console.error('Top products error:', error);
    res.status(500).json({
      success: false,
      message: 'En çok satan ürünler alınamadı',
      error: error.message
    });
  }
});

// Get feedback statistics
router.get('/feedback', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
  try {
    // Get average rating
    const averageRating = await db.getOne(`
      SELECT
        IFNULL(AVG(overall_rating), 0) AS avg_rating,
        COUNT(*) AS total_count
      FROM feedback
    `);

    // Get rating distribution
    const ratings = await db.query(`
      SELECT
        overall_rating AS rating,
        COUNT(*) AS count
      FROM feedback
      GROUP BY overall_rating
      ORDER BY overall_rating
    `);

    // Ensure numeric values for ratings
    const formattedRatings = ratings.map(rating => ({
      ...rating,
      rating: Number(rating.rating),
      count: Number(rating.count)
    }));

    res.json({
      success: true,
      data: {
        averageRating: averageRating ? Number(averageRating.avg_rating) : 0,
        totalCount: averageRating ? Number(averageRating.total_count) : 0,
        ratings: formattedRatings
      }
    });
  } catch (error) {
    console.error('Feedback statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Geri bildirim istatistikleri alınamadı',
      error: error.message
    });
  }
});

module.exports = router;
