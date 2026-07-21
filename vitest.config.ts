import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/scenario/vitest.config.ts',
      'packages/grading/vitest.config.ts',
      './vitest.web.config.ts'
    ]
  }
});
