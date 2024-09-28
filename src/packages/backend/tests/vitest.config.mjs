/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { setupDotenv } from 'c12';
import { resolve } from 'pathe';

export default defineConfig(async () => {
  const envFile = resolve('./../../.env');
  await setupDotenv({ 
    interpolate: false,
    fileName: envFile
  });

 return {
  test: {
      cache: false,
      environment: 'node',
      maxConcurrency: 1,
      testTimeout: 1000,
      //testNamePattern: '.*', // run only tests which match regex
      sequence: {
        concurrent: false
      }
    }
  };
});