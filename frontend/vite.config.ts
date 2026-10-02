// Vite config for the React frontend.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // The .NET API serves the built app from its wwwroot folder.
    outDir: '../backend/wwwroot',
    emptyOutDir: true,
  },
})
