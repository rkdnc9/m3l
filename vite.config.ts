import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:;"
    },
    open: '/widget-test.html'
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  build: {
    target: 'esnext',
    sourcemap: false,  // Disable source maps
    rollupOptions: {
      output: {
        extend: true,
        manualChunks: undefined
      }
    },
    lib: {
      entry: 'src/widget.ts',
      name: 'M3LWidget',
      fileName: 'm3l-widget',
      formats: ['iife', 'es']
    }
  }
})