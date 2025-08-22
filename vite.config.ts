/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Exclude server-side files from the client build
    rollupOptions: {
      external: [
        'fs',
        'path',
        'os',
        'child_process',
        'crypto',
        'open'
      ]
    },
    // Disable sourcemaps for faster builds
    sourcemap: false,
    // Enable minification to prevent potential circular reference issues
    minify: true
  },
  server: {
    // Disable HMR that might be causing issues
    hmr: false
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
})