import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;
  const isNeu = process.env.NEU_BUILD === 'true';
  const isNative = isTauri || isNeu;

  return {
    base: './', // Use relative paths for desktop builds
    plugins: [
      react(), 
      tailwindcss(),
      legacy({
        targets: ['defaults', 'not IE 11', 'Android >= 5'],
      }),
      ...(isNative ? [] : [

        VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            name: 'Steem Writer',
            short_name: 'Steem Writer',
            description: 'Local-first Markdown Editor for Steem Blockchain',
            theme_color: '#0f172a',
            background_color: '#0f172a',
            display: 'standalone',
            icons: [
              {
                src: '192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: '512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        })
      ])
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
