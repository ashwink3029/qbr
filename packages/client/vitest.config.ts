import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@qbr/shared': resolve(__dirname, '../shared/src/index.ts') } },
  test: { environment: 'jsdom', globals: false, setupFiles: ['./src/test-setup.ts'] },
});
