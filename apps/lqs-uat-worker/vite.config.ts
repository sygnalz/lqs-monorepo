import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'worker',
      fileName: '_worker',
      formats: ['es']
    },
    rollupOptions: {
      external: []
    },
    outDir: 'dist'
  }
})