import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path/win32'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  build:{
    rolldownOptions:{output:{
      strictExecutionOrder:true,
      codeSplitting:{groups:[{name:'vendor',test:/node_modules/,maxSize:350000}]}
    }}
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.FOLIO_API_URL ?? 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: process.env.FOLIO_API_URL ?? 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
