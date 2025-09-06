import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose the server to the network
    port: 3000,
    allowedHosts: [
      '3000-i275f7i7rti91t1yfinmh-6532622b.e2b.dev'
    ],
  },
})
