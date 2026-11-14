import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0', // Listen on all network addresses (LAN access)
    port: 5173,
    strictPort: true, // Do not switch to 5174 if busy
    cors: true,
    allowedHosts: true, // Allow tunnel domains and all hosts
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
