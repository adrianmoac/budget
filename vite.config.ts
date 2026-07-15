import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// The Supabase project URL is used to build a NetworkOnly runtime-caching rule:
// authenticated financial responses (/rest, /auth, /functions) must NEVER be
// served from cache (architecture §13, online-only PWA).
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
let supabaseOrigin = '';
try {
  supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : '';
} catch {
  supabaseOrigin = '';
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the app shell / static assets only.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        // Never cache Supabase API/auth traffic — the app is online-only.
        runtimeCaching: supabaseOrigin
          ? [
              {
                urlPattern: ({ url }) => url.origin === supabaseOrigin,
                handler: 'NetworkOnly',
              },
            ]
          : [],
        navigateFallbackDenylist: [/^\/rest/, /^\/auth/, /^\/functions/],
      },
      manifest: {
        name: 'Budget Manager',
        short_name: 'Budget',
        description: 'Gestor de presupuesto personal (MXN).',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'es-MX',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/types/**',
        'src/main.tsx',
      ],
    },
  },
});
