import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:;"
    }
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  build: {
    target: 'esnext',
    sourcemap: false,  // Disable source maps
    rollupOptions: {
      output: {
        format: 'es'
      }
    }
  }
})