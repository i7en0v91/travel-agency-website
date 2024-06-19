import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    fileParallelism: false,
    sequence: {
      concurrent: false
    }
  }
});
