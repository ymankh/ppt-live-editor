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
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
