import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
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
