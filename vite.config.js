import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: 'index.js',
      name: 'prep-engine',
      fileName: (format) => `prep-engine.${format}.js`,
      formats: ['es', 'umd']
    },

    rollupOptions: {
      external: ['lodash'],
      output: {
        globals: {
          lodash: '_'
        }
      }
    },

    minify: 'terser',
    sourcemap: true
  }
})