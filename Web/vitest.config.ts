import { defineConfig } from 'vitest/config';
import path from 'node:path';

// NEXLI — Vitest config (unit tests for PURE logic only).
//
// We deliberately keep this separate from `vite.config.ts`: the app config loads
// the PWA/React/Tailwind plugins which are irrelevant (and slow) for node-side
// unit tests of pure functions. The `@` alias is mirrored here so test files can
// import app modules by their normal `@/...` path.
//
// IMPORTANT: only `src/**/*.test.ts` is collected. `test/rules.test.mjs` needs the
// Firestore emulator (run via `npm run test:rules`) and is excluded so vitest never
// tries to execute it.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', 'test/rules.test.mjs'],
  },
});
