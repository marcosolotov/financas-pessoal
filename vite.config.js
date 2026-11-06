import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A pasta `client` é a raiz do Vite; a build sai para <raiz>/dist
export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});