import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

// Initialize Database Connection asynchronously
connectDatabase();

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 Trutify Node.js Backend Server running`);
  console.log(`📡 Port:        ${env.PORT}`);
  console.log(`⚙️  Environment: ${env.NODE_ENV}`);
  console.log(`🩺 Healthcheck: http://localhost:${env.PORT}/api/health`);
  console.log(`=========================================`);
});

// Graceful Shutdown
const handleShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Gracefully closing server...`);
  await disconnectDatabase();
  server.close(() => {
    console.log('✅ HTTP server closed. Process exiting.');
    process.exit(0);
  });

  // Force close after 10s if connections refuse to close
  setTimeout(() => {
    console.error('⚠️ Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default server;
