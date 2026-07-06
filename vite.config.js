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
  server: {
    proxy: {
      '/extras': {
        target: 'https://assets.hako.moe',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/extras': {
        target: 'https://assets.hako.moe',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    wasm(),
    svelte({
      onwarn: (warning, handler) => {
        const ignoredCodes = [
          'a11y_no_static_element_interactions',
          'a11y_click_events_have_key_equivalents',
          'a11y_no_noninteractive_elements',
          'a11y_label_has_associated_control',
          'a11y_consider_explicit_label',
        ];

        if (ignoredCodes.includes(warning.code)) {
          return;
        }

        handler(warning);
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png'],
      manifest: {
        name: 'Hako',
        short_name: 'Hako',
        description: 'Hako is a box of everything Japanese media.',
        theme_color: '#141415',
        background_color: '#141415',
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
        screenshots: [
          {
            src: '/screenshot-desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Hako Desktop View',
          },
          {
            src: '/screenshot-mobile.png',
            sizes: '375x667',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Hako Mobile View',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)(?:\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache-v5',
              expiration: {
                maxEntries: 5000,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
