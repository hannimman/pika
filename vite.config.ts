import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base '/pika/' → GitHub Pages project site (hannimman.github.io/pika/)
export default defineConfig({
  base: '/pika/',
  plugins: [react()],
})
