import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { testConnection, pool } from './config/db.js';
import { ensureAuthSchema } from './utils/authSchemaBootstrap.js';

const PORT = Number(process.env.PORT || 5000);

async function initializeDatabaseInBackground(): Promise<void> {
  const startedAt = Date.now();

  try {
    console.log('🚀 Startup begin: checking DB and schema in background...');
    await testConnection();
    console.log(`⏱️ testConnection() finished in ${Date.now() - startedAt}ms`);

    await ensureAuthSchema();
    console.log(`⏱️ ensureAuthSchema() finished in ${Date.now() - startedAt}ms`);
  } catch (dbError) {
    console.warn('⚠️ MySQL connection warning: Unable to connect to MySQL database at startup.');
    console.warn('   Ensure MySQL is running and your .env credentials are correct.');
    console.warn('   Error details:', (dbError as Error).message);
    console.warn(`⏱️ Startup DB step failed after ${Date.now() - startedAt}ms`);
  }
}

async function startServer(): Promise<void> {
  try {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Finance Tracker Backend API is running on http://localhost:${PORT}`);
      console.log(`   Healthcheck: http://localhost:${PORT}/api/health`);
      console.log(`   Transactions: http://localhost:${PORT}/api/transactions`);
      console.log(`   Summary: http://localhost:${PORT}/api/summary`);
      console.log(`⏱️ Server listening on port ${PORT}`);

      void initializeDatabaseInBackground();
    });

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

