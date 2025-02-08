import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Content-Security-Policy': "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:;"
    },
    open: '/'
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,  // Disable source maps
    rollupOptions: {
      output: {
        format: 'es',
        dir: 'dist',
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
        inlineDynamicImports: false
      }
    },
    lib: {
      entry: {
        main: resolve(__dirname, 'src/main.ts'),
        widget: resolve(__dirname, 'src/widget.ts')
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`
    },
    copyPublicDir: true
  },
  publicDir: 'public'
})