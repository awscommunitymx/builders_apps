import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Server host configuration
    host: true, // Allow external access (0.0.0.0)
    port: 3000,
    strictPort: false, // Try next available port if 3000 is taken

    // Automatically open browser on server start
    open: true,

    // CORS configuration for development
    cors: true,

    // Hot Module Replacement (HMR) configuration
    hmr: {
      overlay: true, // Show error overlay in browser
      port: 24678, // Custom HMR port to avoid conflicts
    },

    // File system serving options
    fs: {
      strict: true, // Restrict serving files outside workspace root
      allow: [
        // Allow serving files from workspace root and one level up
        '..',
        // Add custom allowed paths here if needed
      ],
    },

    // Development server headers
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
    },

    // Proxy configuration for API calls (example)
    proxy: {
      // Proxy API calls to backend server
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // WebSocket proxy example
      '/socket.io': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },

    // File watching configuration
    watch: {
      usePolling: false, // Set to true if on WSL2 or having file watching issues
      interval: 100,
    },

    // Warmup frequently used files for better performance
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/Layout.tsx',
        './src/components/**/*.tsx',
        './src/routes/**/*.tsx',
      ],
    },
  },
});
