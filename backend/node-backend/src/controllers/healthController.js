import { env } from '../config/env.js';
import { checkPythonServiceHealth } from '../services/pythonClient.js';
import { getDatabaseStatus } from '../config/database.js';

export const getHealth = async (req, res) => {
  const pythonHealth = await checkPythonServiceHealth(3000);
  const dbStatus = getDatabaseStatus();

  const isHealthy = pythonHealth.status === 'healthy';

  res.status(isHealthy ? 200 : 207).json({
    success: true,
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'trutify-node-backend',
      version: '1.0.0',
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dependencies: {
        pythonVerificationService: pythonHealth,
        database: {
          status: dbStatus
        }
      }
    }
  });
};
