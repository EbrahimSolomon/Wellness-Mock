import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// allow any random subdomain from Cloudflare quick tunnels (and LocalTunnel)
const ALLOWED = ['localhost', '127.0.0.1', '.trycloudflare.com', '.loca.lt']

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ALLOWED,   // <-- this unblocks the tunnel host
    hmr: { clientPort: 443 } // good for tunnels behind HTTPS
  },
  preview: {
    host: true,
    allowedHosts: ALLOWED
  }
})
