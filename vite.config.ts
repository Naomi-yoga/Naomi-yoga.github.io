import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/** GitHub Pages 子路径：仓库名为 xxx 时设为 '/xxx/'，根域名或自定义域设为 '/' */
const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})