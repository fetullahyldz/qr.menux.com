const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// MySQL connection pool
let pool = null;

// MySQL connection config
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'qr_menu_db',
  port: process.env.DB_PORT || '3306',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Initialize MySQL pool
const setupMySQLPool = async () => {
  try {
    console.log('Database configuration:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port
    });
    return await mysql.createPool(dbConfig);
  } catch (error) {
    console.error('Failed to create MySQL pool:', error);
    throw error;
  }
};

// Initialize database connection
const initializeDatabase = async () => {
  try {
    pool = await setupMySQLPool();
    console.log('Connected to MySQL server successfully');
    return pool;
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    throw error;
  }
};

// Helper functions for database operations
const db = {
  // Initialize the database connection
  init: async () => {
    return await initializeDatabase();
  },

  // Query that returns multiple rows
  query: async (sqlQuery, params = []) => {
    try {
      const [rows] = await pool.query(sqlQuery, params);
      return rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  // Query that returns a single row
  getOne: async (sqlQuery, params = []) => {
    try {
      const [rows] = await pool.query(sqlQuery, params);
      return rows.length ? rows[0] : null;
    } catch (error) {
      console.error('Database getOne error:', error);
      throw error;
    }
  },

  // Execute query (insert, update, delete)
  run: async (sqlQuery, params = []) => {
    try {
      const [result] = await pool.query(sqlQuery, params);

      // For INSERT operations, return the insertId
      if (sqlQuery.toLowerCase().indexOf('insert') > -1) {
        return {
          insertId: result.insertId,
          affectedRows: result.affectedRows
        };
      }

      // For other operations (UPDATE, DELETE), return affected rows
      return {
        affectedRows: result.affectedRows
      };
    } catch (error) {
      console.error('Database run error:', error);
      throw error;
    }
  },

  // Get a connection for transactions
  getConnection: async () => {
    return await pool.getConnection();
  },

  // Execute several SQL statements in a transaction
  transaction: async (callback) => {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const result = await callback(connection);

      await connection.commit();
      return result;
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Transaction error:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  // Execute a SQL file
  executeFile: async (filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`SQL file not found: ${filePath}`);
      }

      const sql = fs.readFileSync(filePath, 'utf8');
      const statements = sql.split(';').filter(statement => statement.trim() !== '');

      for (const statement of statements) {
        if (statement.trim()) {
          await db.run(statement);
        }
      }

      console.log(`Successfully executed SQL file: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`Error executing SQL file ${filePath}:`, error);
      throw error;
    }
  },

  // Get the pool instance
  getPool: () => {
    return pool;
  }
};

// Export the database helper
module.exports = db;
