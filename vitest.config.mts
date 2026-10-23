import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    // Node, not jsdom: the core modules under test are deliberately free of DOM
    // access. Anything needing a DOM is covered by the Playwright suite, which
    // runs the real built site.
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    reporters: 'default',
  },
})