import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// DailyWork — Vite configuration with React + Tailwind CSS v4
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind CSS v4 Vite plugin (no postcss/config file needed)
  ],
})
