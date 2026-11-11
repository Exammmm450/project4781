const app = require('./src/app');
const env = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');

const PORT = env.port || 5000;

async function bootstrap() {
  try {
    console.log('------------------------------------------------------------');
    console.log('   TITAN NEXT-GEN NEOBANK & TREASURY MANAGEMENT PLATFORM   ');
    console.log('------------------------------------------------------------');
    console.log('[System] Initializing Core Financial Services...');

    // Connect to database
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`[HTTP Server] Operational on port ${PORT}`);
      console.log(`[API Base]    http://localhost:${PORT}/api`);
      console.log(`[Health]      http://localhost:${PORT}/api/health`);
      console.log(`[Admin HQ]    Secret key configured: [${env.adminSecretKey}]`);
      console.log('------------------------------------------------------------');
    });

    const shutdown = async (signal) => {
      console.log(`\n[System] Received ${signal}. Commencing graceful settlement...`);
      server.close(async () => {
        await disconnectDB();
        console.log('[System] All connections safely drained. Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[System] Fatal error during bootstrap:', err);
    process.exit(1);
  }
}

bootstrap();

