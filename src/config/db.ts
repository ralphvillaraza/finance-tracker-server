import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MySQL Connection Pool
 * Uses environment variables strictly for all credentials.
 * Utilizes connection pooling for performance and thread safety.
 */
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'finance_tracker',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

/**
 * Test Database Connection Pool
 */
export async function testConnection(): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    console.log('✅ Connected to MySQL database pool successfully.');
  } finally {
    connection.release();
  }
}

