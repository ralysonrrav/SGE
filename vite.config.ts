import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: './', // Define que o projeto está na raiz, não na pasta src
  build: {
    outDir: 'dist',
    emptyOutDir: true, // Limpa a pasta dist antes de cada build
    rollupOptions: {
      input: {
        main: './index.html', // Garante que o ponto de entrada é o seu HTML
      },
    },
  },
  resolve: {
    alias: {
      // Isso ajuda o Vite a encontrar seus componentes na raiz
      '@': './',
    },
  },
})