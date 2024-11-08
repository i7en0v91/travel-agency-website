/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig(async () => {  
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