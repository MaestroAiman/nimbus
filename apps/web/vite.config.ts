import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Les evenements fs natifs ne traversent pas toujours les bind mounts Docker Desktop
    // sur Windows/Mac : le polling garantit que le HMR fonctionne en conteneur.
    watch: {
      usePolling: true,
    },
  },
})
