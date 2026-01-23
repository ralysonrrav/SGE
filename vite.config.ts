
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: './',
  define: {
    // Garante que a chave exista como string, mesmo que vazia, evitando erro de referência
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ""),
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    fs: {
      allow: ['.'],
    },
  },
})
