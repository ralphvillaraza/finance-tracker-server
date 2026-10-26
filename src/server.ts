import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { testConnection, pool } from './config/db.js';
import { ensureAuthSchema } from './utils/authSchemaBootstrap.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer(): Promise<void> {
  try {
    // Verify database connection before binding port
    try {
      await testConnection();
      await ensureAuthSchema();
    } catch (dbError) {
      console.warn('⚠️ MySQL connection warning: Unable to connect to MySQL database at startup.');
      console.warn('   Ensure MySQL is running and your .env credentials are correct.');
      console.warn('   Error details:', (dbError as Error).message);
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 Finance Tracker Backend API is running on http://localhost:${PORT}`);
      console.log(`   Healthcheck: http://localhost:${PORT}/api/health`);
      console.log(`   Transactions: http://localhost:${PORT}/api/transactions`);
      console.log(`   Summary: http://localhost:${PORT}/api/summary`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await pool.end();
          console.log('MySQL pool closed.');
        } catch (e) {
          console.error('Error closing MySQL pool:', e);
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

