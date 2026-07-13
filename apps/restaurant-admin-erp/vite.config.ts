import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function erpSpaRouteCopies(routes: string[]): Plugin {
  return {
    name: 'erp-spa-route-copies',
    closeBundle() {
      const outDir = path.resolve(__dirname, '../../dist/garson/erp');
      const indexPath = path.join(outDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;

      const html = fs.readFileSync(indexPath, 'utf8');
      for (const route of routes) {
        const targetDir = path.join(outDir, route);
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(path.join(targetDir, 'index.html'), html);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), erpSpaRouteCopies(['orders', 'menu'])],
  base: '/garson/erp/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../../dist/garson/erp'),
    emptyOutDir: true,
  },
});
