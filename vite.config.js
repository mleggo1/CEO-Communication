import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 👇 This tells GitHub Pages the app is served under /CEO-Communication/
  base: '/CEO-Communication/',
  build: {
    // 👇 Put the built files into "docs" (GitHub Pages can use this)
    outDir: 'docs',
  },
})
