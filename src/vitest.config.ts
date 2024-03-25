import { defineVitestConfig } from '@nuxt/test-utils/config';

export default defineVitestConfig({
  test: {
    sequence: {
      concurrent: false
    }
  }
});
