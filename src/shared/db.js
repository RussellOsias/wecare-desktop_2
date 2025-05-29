const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('Database connection details:', {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wecare',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Test connection immediately
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to database!');
    connection.release();
    
    // Verify the users table exists
    const [rows] = await connection.query('SHOW TABLES LIKE "users"');
    if (rows.length === 0) {
      console.error('ERROR: "users" table not found in database!');
    } else {
      console.log('Verified "users" table exists');
    }
  } catch (error) {
    console.error('Database connection failed:', error);
  }
})();

module.exports = {
  query: async (sql, params) => {
      const connection = await pool.getConnection();
      try {
          console.log('Executing query:', sql, params);
          const rows = await connection.query(sql, params);
          console.log('Query result:', rows);
          return rows;
      } catch (error) {
          console.error('Query failed:', error);
          throw error;
      } finally {
          connection.release();
      }
  },
  close: async () => {
      await pool.end();
  }
};