import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Оптимизация сборки
  build: {
    // Минимальный размер для кода-сплиттинга
    rollupOptions: {
      output: {
        manualChunks: {
          // Выносим React в отдельный чанк
          'react-vendor': ['react', 'react-dom'],
          // Выносим utils в отдельный чанк если он станет большим
          'utils': ['./src/utils/helpers.ts']
        }
      }
    },
    
    // Сжатие
    minify: 'esbuild',
    
    // Размер чанков для предупреждений
    chunkSizeWarningLimit: 1000,
    
    // Sourcemaps для продакшена (можно отключить)
    sourcemap: false,
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Оптимизация ассетов
    assetsInlineLimit: 4096 // 4kb
  },

  // Настройки для dev сервера
  server: {
    port: 5173,
    open: true,
    cors: true
  },

  // Оптимизация зависимостей
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: []
  },

  // CSS препроцессор настройки
  css: {
    devSourcemap: true
  }
})
