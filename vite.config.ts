import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Define explicitamente que a raiz do projeto é onde o arquivo config está
  root: './',
  build: {
    outDir: 'dist',
    // Limpa a pasta de saída antes de cada novo build para evitar arquivos residuais
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Usa o caminho relativo correto para o ponto de entrada
        main: './index.html',
      },
    },
  },
  server: {
    // Garante que o servidor local procure arquivos na raiz
    fs: {
      allow: ['.'],
    },
  },
})