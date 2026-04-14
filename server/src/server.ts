import app from './app';
import { env } from './config/env';
import { testConnection, db } from './config/database';

async function startServer(): Promise<void> {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start the server
    const server = app.listen(env.port, () => {
      console.log(`
========================================
  AI Debate API Server
========================================
  Environment: ${env.nodeEnv}
  Port: ${env.port}
  Frontend URL: ${env.frontend.url}
  Ollama URL: ${env.ollama.baseUrl}
========================================
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log('HTTP server closed');
        await db.end();
        console.log('Database connections closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
