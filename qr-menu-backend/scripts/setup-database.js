/**
 * Veritabanı kurulum scripti
 * Bu script, MySQL veritabanını ve tabloları oluşturur ve test verilerini ekler.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connection configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  port: process.env.DB_PORT || 3306,
  multipleStatements: true
};

// Get database name
const dbName = process.env.DB_NAME || 'qr_menu_db';

// Paths to SQL files
const rootDir = path.resolve(__dirname, '../..');
const databaseFilePath = path.join(rootDir, 'qr-menu-database.sql');
const testDataFilePath = path.join(rootDir, 'test-data.sql');
const adminUserFilePath = path.join(rootDir, 'admin-user.sql');

/**
 * Execute an SQL file
 * @param {mysql.Connection} connection - MySQL connection
 * @param {string} filePath - Path to the SQL file
 * @param {string} description - Description of what the file does
 */
async function executeSQLFile(connection, filePath, description) {
  try {
    console.log(`Reading ${description} SQL file...`);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Executing ${description} SQL queries...`);
    await connection.query(sql);

    console.log(`${description} SQL executed successfully!`);
    return true;
  } catch (error) {
    console.error(`Error executing ${description} SQL:`, error);
    throw error;
  }
}

/**
 * Main setup function
 */
async function setupDatabase() {
  let connection;

  try {
    console.log('Setting up database...');

    // Create connection to MySQL server (without specifying a database)
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection(config);
    console.log('Connected to MySQL server successfully!');

    // Check if database exists
    console.log(`Checking if database '${dbName}' exists...`);
    const [rows] = await connection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName]
    );

    if (rows.length === 0) {
      // Database doesn't exist, create it
      console.log(`Database '${dbName}' does not exist. Creating it...`);
      await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`Database '${dbName}' created successfully!`);
    } else {
      console.log(`Database '${dbName}' already exists.`);
    }

    // Close the initial connection
    await connection.end();

    // Create a new connection to the specific database
    config.database = dbName;
    connection = await mysql.createConnection(config);
    console.log(`Connected to database '${dbName}'!`);

    // Execute the database schema SQL
    if (fs.existsSync(databaseFilePath)) {
      await executeSQLFile(connection, databaseFilePath, 'database schema');
    } else {
      console.error(`Database schema file not found: ${databaseFilePath}`);
    }

    // Execute the test data SQL
    if (fs.existsSync(testDataFilePath)) {
      await executeSQLFile(connection, testDataFilePath, 'test data');
    } else {
      console.log(`Test data file not found: ${testDataFilePath}`);
    }

    // Execute the admin user SQL
    if (fs.existsSync(adminUserFilePath)) {
      await executeSQLFile(connection, adminUserFilePath, 'admin user');
    } else {
      console.log(`Admin user file not found: ${adminUserFilePath}`);
    }

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run the setup process
setupDatabase();
