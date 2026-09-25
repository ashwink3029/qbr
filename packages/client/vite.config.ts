import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: './', // relative paths, so a later Capacitor wrap serves correctly
  plugins: [react()],
  resolve: { alias: { '@qbr/shared': resolve(__dirname, '../shared/src/index.ts') } },
  server: { host: true, port: 5176 }, // 5173 casual, 5174 cubes, 5176 qbr
});
