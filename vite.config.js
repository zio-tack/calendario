import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './calendario/', // percorsi relativi: funziona anche se ospitato in una sottocartella
  plugins: [
    react(),
    // PWA: genera manifest + service worker (l'app funziona offline e si installa)
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Calendario', short_name: 'Calendario', display: 'standalone',
        start_url: '.', background_color: '#ffffff', theme_color: '#1f4e5f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png}'],
        // config.json NON va in precache: cosi' le modifiche si vedono senza rifare la build
        runtimeCaching: [{ urlPattern: /config\.json$/, handler: 'NetworkFirst' }],
      },
    }),
  ],
});
