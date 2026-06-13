import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import wasm from "vite-plugin-wasm";
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '$core': path.resolve(__dirname, './src/core/'),
      '$shared': path.resolve(__dirname, './src/shared/'),
      '$utils': path.resolve(__dirname, './src/shared/utils/'),
      '$features': path.resolve(__dirname, './src/features/'),
      '$components': path.resolve(__dirname, './src/shared/components/'),
      '$wasm': path.resolve(__dirname, './src-wasm/pkg/'),
    }
  },
  build: {
    target: 'esnext',
  },
  plugins: [
    wasm(),
    svelte({
      onwarn: (warning, handler) => {
        // List of warning codes to ignore
        const ignoredCodes = [
          'a11y_no_static_element_interactions',
          'a11y_click_events_have_key_equivalents',
          'a11y_no_noninteractive_elements',
          'a11y_label_has_associated_control',
          'a11y_consider_explicit_label',
        ];

        // Debugging: Log all intercepted warning codes
        console.log(`Svelte warning intercepted: ${warning.code}`);

        // If the warning code is in our ignored list, do nothing (effectively ignore it)
        if (ignoredCodes.includes(warning.code)) {
          return;
        }

        // For all other warnings, call the default handler
        handler(warning);
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hako',
        shortName: 'Hako',
        description: 'Hako is a box of everything Japanese media.',
        themeColor: '#141415',
        backgroundColor: '#141415',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Unified cache strategy for all image assets
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)(?:\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache-v5',
              expiration: {
                maxEntries: 5000,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200] // 0 handles opaque cross-origin responses
              }
            },
          },
        ],
      },
    }),
  ],
});
