import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/r/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@istebul/ai-concierge': path.resolve(__dirname, '../../src/ai-concierge/index.ts'),
      '@istebul/ai-core': path.resolve(__dirname, '../../src/ai-core/index.ts'),
      '@istebul/ai-actions': path.resolve(__dirname, '../../src/ai-actions/index.ts'),
      '@istebul/payment-gateway': path.resolve(__dirname, '../../src/payment-gateway/index.ts'),
      '@istebul/restaurant-knowledge': path.resolve(
        __dirname,
        '../../src/restaurant-knowledge/index.ts',
      ),
    },
  },

  build: {
    outDir: path.resolve(__dirname, '../../dist/r'),
    emptyOutDir: false,
    assetsDir: 'cx-assets',
  },
});
