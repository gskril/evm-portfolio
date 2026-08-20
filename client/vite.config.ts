import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

const backendTarget = 'http://127.0.0.1:8579'

const backendProxy = {
  '/api': {
    target: backendTarget,
    changeOrigin: true,
    rewrite: (requestPath: string) => requestPath.replace(/^\/api/, ''),
  },
  '/dashboard': {
    target: backendTarget,
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: backendProxy,
  },
  preview: {
    proxy: backendProxy,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server/hc': path.resolve(__dirname, '../server/dist/hc.d.ts'),
    },
  },
})
