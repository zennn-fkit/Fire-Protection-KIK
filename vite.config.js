import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: ['dashboard.tyhomes.my.id']
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Pisahkan recharts ke chunk sendiri (biasanya penyumbang terbesar)
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'recharts-vendor';
            }
            // Pisahkan html2canvas dan jspdf ke chunk sendiri
            if (id.includes('html2canvas') || id.includes('jspdf')) {
              return 'pdf-vendor';
            }
            // Semua library lain di node_modules jadi satu chunk 'vendor'
            return 'vendor';
          }
        },
      },
    },
  },
})