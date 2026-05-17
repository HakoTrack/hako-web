import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte({
      onwarn: (warning, handler) => {
        const ignoredCodes = [
          'a11y_no_static_element_interactions',
          'a11y_click_events_have_key_equivalents',
          'a11y_no_noninteractive_elements'
        ]
        if (!ignoredCodes.includes(warning.code)) {
          return;
        }
        handler(warning);
      },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [
          {
            // Cache all image requests
            urlPattern: /.*\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
    }),
  ],
});
