import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            // Intercept ECONNREFUSED when backend server is offline
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: false,
                  error: {
                    code: 'BACKEND_OFFLINE',
                    message:
                      'Node.js API Gateway is not running on port 5000. Please start the backend service in another terminal (cd trutify/backend/node-backend && npm run dev).'
                  }
                })
              );
            }
          });
        }
      }
    }
  }
});
